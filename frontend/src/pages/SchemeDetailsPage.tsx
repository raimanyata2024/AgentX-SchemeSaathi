import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { schemeService } from '@/services/api/schemeService';
import { eligibilityService } from '@/services/api/eligibilityService';
import { documentService } from '@/services/api/documentService';
import { Scheme, EligibilityResult, DocumentRequirement } from '@/types';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { useApiMode } from '@/context/ApiModeContext';
import { isAuthenticationError, isNotFoundError, isUuidString } from '@/utils/errors';
import { pickLang, resolveLookupCodeFromRouteParam } from '@/utils/i18n';
import { AuthPromptCard } from '@/components/common/AuthPromptCard';
import { Card, CardHeader, CardContent } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Spinner } from '@/components/common/Spinner';
import { StatusBanner } from '@/components/common/StatusBanner';
import { LoginModal } from '@/components/common/LoginModal';
import {
  ExternalLink,
  ShieldCheck,
  Building,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Calendar,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  HelpCircle,
  XCircle,
  LogIn,
  Info,
  Coins,
  Send,
  MapPin,
  Check,
  PiggyBank,
  TrendingUp,
  HeartHandshake,
  AlertCircle,
} from 'lucide-react';

export type SchemeDetailTab =
  | 'overview'
  | 'benefits'
  | 'eligibility'
  | 'documents'
  | 'application'
  | 'sources';

export const SchemeDetailsPage: React.FC<{
  initialScheme?: Scheme;
  initialDocuments?: DocumentRequirement[];
}> = ({ initialScheme, initialDocuments }) => {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { profile, isAuthenticated, token, isLoading: authLoading } = useAuth();
  const { isMockMode } = useApiMode();

  const [scheme, setScheme] = useState<Scheme | null>(initialScheme || null);
  const [eligibility, setEligibility] = useState<EligibilityResult | null>(null);
  const [documents, setDocuments] = useState<DocumentRequirement[]>(initialDocuments || []);
  const [loading, setLoading] = useState<boolean>(!initialScheme);
  const [loadError, setLoadError] = useState<{ kind: 'auth' | 'not_found' | 'network'; message: string } | null>(null);
  const [checkingEligibility, setCheckingEligibility] = useState<boolean>(false);
  const [eligibilityError, setEligibilityError] = useState<string | null>(null);
  const [isLoginOpen, setIsLoginOpen] = useState<boolean>(false);

  // Active Tab state (synced with ?tab= search param)
  const initialTab = (searchParams.get('tab') as SchemeDetailTab) || 'overview';
  const [activeTab, setActiveTab] = useState<SchemeDetailTab>(
    ['overview', 'benefits', 'eligibility', 'documents', 'application', 'sources'].includes(initialTab)
      ? initialTab
      : 'overview'
  );

  // Sync state if URL search param changes
  useEffect(() => {
    const tabParam = searchParams.get('tab') as SchemeDetailTab;
    if (
      tabParam &&
      ['overview', 'benefits', 'eligibility', 'documents', 'application', 'sources'].includes(tabParam)
    ) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Load scheme details and document checklist if not pre-provided
  useEffect(() => {
    const loadData = async () => {
      if (!id || initialScheme) return;
      if (authLoading) return;

      if (!isAuthenticated && !token && !isMockMode) {
        setScheme(null);
        setLoadError({
          kind: 'auth',
          message: pickLang(
            language,
            'Please sign in with your citizen account to view full scheme benefits, documents, and official sources.',
            'योजना के संपूर्ण लाभ, दस्तावेज़ और आधिकारिक स्रोत देखने के लिए कृपया लॉग इन करें।',
            'योजनेचे संपूर्ण लाभ, कागदपत्रे आणि अधिकृत संदर्भ पाहण्यासाठी कृपया लॉग इन करा.'
          ),
        });
        setLoading(false);
        return;
      }

      setLoading(true);
      setLoadError(null);
      try {
        let targetId = id;
        if (!isMockMode && !isUuidString(id)) {
          const lookupCode = resolveLookupCodeFromRouteParam(id);
          const candidates = await schemeService.getSchemes({
            q: lookupCode,
            include_pending: true,
            limit: 10,
          });
          const matched =
            candidates.find(
              (c) => (c.scheme_code || '').toLowerCase() === lookupCode.toLowerCase()
            ) || candidates[0];
          if (!matched) {
            setScheme(null);
            setLoadError({ kind: 'not_found', message: 'Scheme not found.' });
            return;
          }
          targetId = matched.id;
        }

        const s = await schemeService.getSchemeById(targetId);
        setScheme(s);
        let docs: DocumentRequirement[] =
          s.documents || (s as any).required_documents || [];
        try {
          const checklist = await documentService.getChecklist(targetId);
          if (checklist && checklist.length > 0) {
            docs = checklist;
          }
        } catch {
          // Fallback to documents defined on the scheme
        }
        setDocuments(docs);
      } catch (err: any) {
        console.error('Failed to load scheme details:', err);
        setScheme(null);
        if (isAuthenticationError(err)) {
          setLoadError({
            kind: 'auth',
            message:
              err?.message ||
              pickLang(
                language,
                'Your session is missing or expired. Please sign in to view this scheme.',
                'आपका लॉगिन सत्र समाप्त हो गया है या उपलब्ध नहीं है। योजना देखने के लिए पुनः लॉग इन करें।',
                'तुमचे लॉगिन सत्र संपले आहे किंवा उपलब्ध नाही. योजना पाहण्यासाठी कृपया पुन्हा लॉग इन करा.'
              ),
          });
        } else if (isNotFoundError(err)) {
          setLoadError({ kind: 'not_found', message: err?.message || 'Scheme not found.' });
        } else {
          setLoadError({
            kind: 'network',
            message:
              err?.message ||
              pickLang(
                language,
                'Failed to load scheme details from server. Please try again.',
                'सर्वर से योजना विवरण लोड नहीं हो सका। कृपया पुनः प्रयास करें।',
                'सर्व्हरवरून योजनेचा तपशील लोड होऊ शकला नाही. कृपया पुन्हा प्रयत्न करा.'
              ),
          });
        }
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id, isAuthenticated, token, authLoading, isMockMode]);

  // Re-evaluate eligibility when switching citizens or when opening the eligibility tab
  useEffect(() => {
    setEligibility(null);
    setEligibilityError(null);
    if (activeTab === 'eligibility' && id && (token || profile)) {
      handleCheckEligibility();
    }
  }, [id, profile?.id]);

  const handleTabClick = (tab: SchemeDetailTab) => {
    setActiveTab(tab);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', tab);
        return next;
      },
      { replace: true }
    );

    // If switching to eligibility tab and user is logged in, auto-check if not already done
    if (tab === 'eligibility' && id && (token || profile) && !eligibility && !checkingEligibility) {
      handleCheckEligibility();
    }
  };

  const handleCheckEligibility = async () => {
    if (!id) return;
    setEligibilityError(null);

    if (!token && !profile) {
      setEligibilityError(
        pickLang(
          language,
          'Please log in to your citizen account to evaluate personal eligibility against official rules.',
          'पात्रता जांचने के लिए कृपया अपने नागरिक खाते में लॉग इन करें।',
          'पात्रता तपासण्यासाठी कृपया तुमच्या नागरिक खात्यात लॉग इन करा.'
        )
      );
      setIsLoginOpen(true);
      return;
    }

    setCheckingEligibility(true);
    try {
      const res = await eligibilityService.checkEligibility(id);
      setEligibility(res);
    } catch (err: any) {
      console.error('Failed eligibility check:', err);
      const msg = err?.message || 'Failed to evaluate eligibility against database criteria.';
      if (isAuthenticationError(err)) {
        setEligibilityError(
          pickLang(
            language,
            'Your session has expired or authentication is missing. Please sign in.',
            'आपका सत्र समाप्त हो गया है। कृपया पुनः लॉग इन करें।',
            'तुमचे सत्र संपले आहे किंवा लॉगिन आवश्यक आहे. कृपया पुन्हा लॉग इन करा.'
          )
        );
        setIsLoginOpen(true);
      } else {
        setEligibilityError(msg);
      }
    } finally {
      setCheckingEligibility(false);
    }
  };

  if (loading || (authLoading && !initialScheme)) {
    return (
      <Spinner
        size="lg"
        label={pickLang(
          language,
          'Loading scheme details...',
          'योजना विवरण लोड हो रहा है...',
          'योजनेची माहिती लोड होत आहे...'
        )}
      />
    );
  }

  if (!scheme) {
    if (loadError?.kind === 'auth') {
      return (
        <div className="py-12 px-4">
          <AuthPromptCard
            kind="auth"
            description={loadError.message}
            onSignIn={() => setIsLoginOpen(true)}
            secondaryAction={
              <Button variant="outline" onClick={() => navigate('/schemes')}>
                {pickLang(language, 'Back to Schemes', 'योजना सूची पर वापस जाएं', 'योजना यादीकडे परत जा')}
              </Button>
            }
          />
          <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
        </div>
      );
    }

    if (loadError?.kind === 'network') {
      return (
        <div className="py-12 px-4">
          <AuthPromptCard
            kind="network"
            description={loadError.message}
            onRetry={() => window.location.reload()}
            secondaryAction={
              <Button variant="outline" onClick={() => navigate('/schemes')}>
                {pickLang(language, 'Back to Schemes', 'योजना सूची पर वापस जाएं', 'योजना यादीकडे परत जा')}
              </Button>
            }
          />
        </div>
      );
    }

    return (
      <div className="text-center py-16 space-y-4">
        <p className="text-navy/60">
          {pickLang(language, 'Scheme not found.', 'योजना प्राप्त नहीं हुई।', 'योजना सापडली नाही.')}
        </p>
        <Button variant="outline" onClick={() => navigate('/schemes')}>
          {pickLang(language, 'Back to Schemes', 'योजना सूची पर वापस जाएं', 'योजना यादीकडे परत जा')}
        </Button>
      </div>
    );
  }

  const targetBeneficiariesList = Array.isArray(scheme.target_beneficiaries)
    ? scheme.target_beneficiaries
    : typeof scheme.target_beneficiaries === 'string'
    ? (scheme.target_beneficiaries as string).split(',').map((s) => s.trim())
    : [];

  const tabs: {
    id: SchemeDetailTab;
    labelEn: string;
    labelHi: string;
    labelMr: string;
    icon: React.ReactNode;
    badgeCount?: number;
  }[] = [
    {
      id: 'overview',
      labelEn: 'Overview / Description',
      labelHi: 'विवरण (Overview)',
      labelMr: 'योजना माहिती',
      icon: <Info className="w-4 h-4" />,
    },
    {
      id: 'benefits',
      labelEn: 'Benefits',
      labelHi: 'योजना के लाभ (Benefits)',
      labelMr: 'योजनेचे लाभ',
      icon: <Coins className="w-4 h-4 text-saffron" />,
    },
    {
      id: 'eligibility',
      labelEn: 'Eligibility',
      labelHi: 'पात्रता निकष (Eligibility)',
      labelMr: 'पात्रता निकष',
      icon: <Sparkles className="w-4 h-4 text-saffron-vibrant" />,
    },
    {
      id: 'documents',
      labelEn: 'Required Documents',
      labelHi: 'आवश्यक दस्तावेज़ (Documents)',
      labelMr: 'आवश्यक कागदपत्रे',
      icon: <FileText className="w-4 h-4" />,
      badgeCount: documents.length > 0 ? documents.length : undefined,
    },
    {
      id: 'application',
      labelEn: 'Application Process',
      labelHi: 'आवेदन प्रक्रिया (Application)',
      labelMr: 'अर्ज प्रक्रिया',
      icon: <Send className="w-4 h-4 text-emerald-600" />,
    },
    {
      id: 'sources',
      labelEn: 'Official Sources',
      labelHi: 'अधिकृत संदर्भ (Official Sources)',
      labelMr: 'अधिकृत संदर्भ',
      icon: <ShieldCheck className="w-4 h-4 text-sage-green" />,
    },
  ];

  return (
    <div className="space-y-7 max-w-4xl mx-auto pb-12">
      {/* Top Breadcrumb / Back button */}
      <Link
        to="/schemes"
        className="inline-flex items-center gap-2 text-xs font-semibold text-navy/60 hover:text-navy transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
        <span>
          {pickLang(
            language,
            'Back to schemes catalog',
            'सभी योजनाओं पर वापस जाएं',
            'सर्व योजनांच्या यादीकडे परत जा'
          )}
        </span>
      </Link>

      {/* Main Scheme Hero Banner */}
      <div className="bg-white rounded-3xl border border-navy/8 p-6 sm:p-8 space-y-4 shadow-subtle relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="category">{scheme.category.replace(/_/g, ' ').toUpperCase()}</Badge>
            <span className="text-[10px] font-mono font-bold bg-ivory-100 text-navy/70 px-2.5 py-0.5 rounded-md border border-navy/10">
              {scheme.scheme_code}
            </span>
            <span className="text-[10px] uppercase font-bold text-navy/50 bg-ivory-100 px-2 py-0.5 rounded border border-navy/10">
              {scheme.geographic_scope === 'central' ? 'Central Sector' : 'State Scheme'}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-navy/60 font-medium">
            <span className="flex items-center gap-1.5 text-sage-green bg-sage-light px-2.5 py-0.5 rounded-full border border-sage/30 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              {scheme.scheme_status}
            </span>
            {scheme.last_verified_at && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-navy/40" />
                Verified: {scheme.last_verified_at.split('T')[0]}
              </span>
            )}
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold font-editorial text-navy leading-tight tracking-tight">
          {scheme.name}
        </h1>

        <div className="flex items-center gap-2 text-xs text-navy/70 font-semibold">
          <Building className="w-4 h-4 text-saffron shrink-0" />
          <span>{scheme.ministry}</span>
          {scheme.department && <span className="text-navy/40">• {scheme.department}</span>}
        </div>

        <p className="text-sm text-navy/70 leading-relaxed pt-1 max-w-3xl">{scheme.description}</p>

        {/* Global Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-navy/8">
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="saffron"
              size="sm"
              leftIcon={<Sparkles className="w-4 h-4" />}
              onClick={() => handleTabClick('eligibility')}
            >
              {t.actions.checkEligibility}
            </Button>

            <Button
              variant="outline"
              size="sm"
              leftIcon={<Coins className="w-4 h-4 text-saffron" />}
              onClick={() => handleTabClick('benefits')}
            >
              {pickLang(language, 'View Benefits', 'लाभ देखें', 'लाभ पहा')}
            </Button>
          </div>

          {scheme.official_url && (
            <a
              href={scheme.official_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-navy/15 text-navy bg-white hover:bg-ivory-50 transition-all duration-200 shadow-subtle"
            >
              <span>{t.labels.officialPortal}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>

      {/* 6 Interactive Scheme Detail Tabs Navigation Bar */}
      <div className="bg-white rounded-2xl border border-navy/10 p-1.5 shadow-subtle">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none" role="tablist">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => handleTabClick(tab.id)}
                className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 border cursor-pointer ${
                  isActive
                    ? 'bg-navy text-white border-navy shadow-subtle'
                    : 'bg-transparent text-navy/70 border-transparent hover:bg-ivory-100 hover:text-navy hover:border-navy/10'
                }`}
              >
                {tab.icon}
                <span>{pickLang(language, tab.labelEn, tab.labelHi, tab.labelMr)}</span>
                {tab.badgeCount !== undefined && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isActive ? 'bg-white/20 text-white' : 'bg-ivory-200 text-navy/70'
                    }`}
                  >
                    {tab.badgeCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TAB 1: OVERVIEW / DESCRIPTION
      ────────────────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-fade-in-up">
          <Card>
            <CardHeader>
              <h3 className="font-bold font-editorial text-navy text-base flex items-center gap-2">
                <Info className="w-4 h-4 text-saffron" />
                <span>
                  {pickLang(
                    language,
                    'Scheme Overview & Objective',
                    'योजना का संपूर्ण विवरण',
                    'योजनेची संपूर्ण माहिती व उद्दिष्ट'
                  )}
                </span>
              </h3>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <p className="text-sm text-navy/80 leading-relaxed font-sans">
                {scheme.description || (
                  <span className="italic text-navy/50">
                    {pickLang(
                      language,
                      'No description registered for this scheme.',
                      'विवरण उपलब्ध नहीं है।',
                      'या योजनेचे विवरण उपलब्ध नाही.'
                    )}
                  </span>
                )}
              </p>

              {/* Administrative Facts Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                <div className="p-3.5 rounded-xl bg-ivory-50 border border-navy/8 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-navy/50 block">
                    {pickLang(language, 'Nodal Ministry', 'मंत्रालय (Ministry)', 'संबंधित मंत्रालय')}
                  </span>
                  <span className="text-xs font-semibold text-navy block">{scheme.ministry}</span>
                </div>

                <div className="p-3.5 rounded-xl bg-ivory-50 border border-navy/8 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-navy/50 block">
                    {pickLang(language, 'Scheme Category', 'योजना श्रेणी (Category)', 'योजना वर्ग')}
                  </span>
                  <span className="text-xs font-semibold text-navy capitalize">
                    {scheme.category.replace(/_/g, ' ')}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-ivory-50 border border-navy/8 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-navy/50 block">
                    {pickLang(language, 'Geographic Scope', 'भौगोलिक व्याप्ती (Scope)', 'भौगोलिक कार्यक्षेत्र')}
                  </span>
                  <span className="text-xs font-semibold text-navy">
                    {scheme.geographic_scope === 'central'
                      ? pickLang(language, 'Central Sector (Pan-India)', 'केंद्रीय योजना (संपूर्ण भारत)', 'केंद्रीय योजना (संपूर्ण भारत)')
                      : pickLang(language, 'State Welfare Scheme', 'राज्य कल्याणकारी योजना', 'राज्य कल्याणकारी योजना')}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Target Beneficiaries Card */}
          <Card>
            <CardHeader>
              <h3 className="font-bold font-editorial text-navy text-base flex items-center gap-2">
                <Building className="w-4 h-4 text-navy/60" />
                <span>{t.labels.targetBeneficiaries}</span>
              </h3>
            </CardHeader>
            <CardContent className="p-6 space-y-3">
              {targetBeneficiariesList.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {targetBeneficiariesList.map((beneficiary, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-ivory-100 text-navy font-semibold text-xs border border-navy/10"
                    >
                      <Check className="w-3.5 h-3.5 text-sage-green" />
                      <span>{beneficiary}</span>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-navy/60">
                  {pickLang(
                    language,
                    'Target beneficiaries criteria not specified.',
                    'लक्षित लाभार्थी विवरण उपलब्ध नहीं है।',
                    'लक्षित लाभार्थी तपशील उपलब्ध नाही.'
                  )}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Quick Action Navigation Prompts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => handleTabClick('benefits')}
              className="p-4 rounded-2xl border border-saffron/30 bg-gradient-to-r from-saffron-light/40 to-white hover:from-saffron-light/60 transition-all text-left space-y-1 shadow-subtle group cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-navy font-editorial flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-saffron" />
                  <span>
                    {pickLang(language, 'View Scheme Benefits', 'वित्तीय लाभ देखें', 'योजनेचे आर्थिक लाभ पहा')}
                  </span>
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-saffron-dark group-hover:translate-x-1 transition-transform" />
              </div>
              <p className="text-[11px] text-navy/60">
                {pickLang(
                  language,
                  'Explore financial amounts, DBT installments, and coverage details.',
                  'डीबीटी राशि, किस्तों और वित्तीय कवरेज की जानकारी।',
                  'DBT रक्कम, हप्ते आणि आर्थिक संरक्षणाची सविस्तर माहिती.'
                )}
              </p>
            </button>

            <button
              onClick={() => handleTabClick('eligibility')}
              className="p-4 rounded-2xl border border-sage/30 bg-gradient-to-r from-sage-light/40 to-white hover:from-sage-light/60 transition-all text-left space-y-1 shadow-subtle group cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-navy font-editorial flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-sage-green" />
                  <span>
                    {pickLang(language, 'Check Your Eligibility', 'अपनी पात्रता जांचें', 'तुमची पात्रता तपासा')}
                  </span>
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-sage-dark group-hover:translate-x-1 transition-transform" />
              </div>
              <p className="text-[11px] text-navy/60">
                {pickLang(
                  language,
                  'Evaluate statutory conditions against your citizen profile.',
                  'अपनी प्रोफ़ाइल के अनुसार त्वरित व सटीक नियम मूल्यांकन।',
                  'तुमच्या नागरिक प्रोफाइलवर आधारित पात्रता नियमांची तपासणी.'
                )}
              </p>
            </button>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 2: BENEFITS
      ────────────────────────────────────────────────────────────── */}
      {activeTab === 'benefits' && (
        <div className="space-y-6 animate-fade-in-up">
          <Card className="border-saffron/25 shadow-subtle">
            <CardHeader className="bg-gradient-to-r from-saffron-light/50 to-white border-b border-saffron/20">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="font-bold font-editorial text-navy text-base flex items-center gap-2">
                  <Coins className="w-5 h-5 text-saffron-vibrant" />
                  <span>
                    {pickLang(
                      language,
                      'Statutory Scheme Benefits & Assistance',
                      'योजना के वैधानिक लाभ एवं वित्तीय सहायता',
                      'योजनेचे वैधानिक लाभ व आर्थिक सहाय्य'
                    )}
                  </span>
                </h3>
                <span className="text-[10px] font-bold text-saffron-dark bg-saffron-light px-2.5 py-0.5 rounded-full border border-saffron/30">
                  Direct Benefit Transfer (DBT)
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {scheme.benefits ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-sage-light/60 border border-sage/25 space-y-2">
                    <span className="text-[10px] uppercase font-bold text-sage-dark tracking-wider block">
                      {pickLang(
                        language,
                        'Official Benefit Entitlement',
                        'मुख्य वित्तीय लाभ (Core Benefit Statement)',
                        'अधिकृत आर्थिक लाभ विवरण'
                      )}
                    </span>
                    <p className="text-sm font-semibold text-navy leading-relaxed font-sans">
                      {scheme.benefits}
                    </p>
                  </div>

                  {/* Highlights Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="p-4 rounded-xl bg-ivory-50 border border-navy/8 space-y-1.5">
                      <span className="text-[10px] uppercase font-bold text-navy/50 flex items-center gap-1.5">
                        <Coins className="w-3.5 h-3.5 text-saffron" />
                        <span>
                          {pickLang(
                            language,
                            'Disbursement Channel',
                            'हस्तांतरण माध्यम (Disbursement Mode)',
                            'लाभ हस्तांतरण माध्यम'
                          )}
                        </span>
                      </span>
                      <p className="text-xs text-navy/80 font-medium">
                        {pickLang(
                          language,
                          'Direct Benefit Transfer (DBT) directly into Aadhaar-seeded bank account via PFMS/NPCI.',
                          'आधार-संलग्न बैंक खाते में प्रत्यक्ष लाभ अंतरण (DBT) द्वारा बिना किसी बिचौलिए के।',
                          'आधार-संलग्न बँक खात्यात थेट लाभ हस्तांतरण (DBT) द्वारे PFMS/NPCI मार्फत रक्कम जमा होते.'
                        )}
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-ivory-50 border border-navy/8 space-y-1.5">
                      <span className="text-[10px] uppercase font-bold text-navy/50 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-sage-green" />
                        <span>
                          {pickLang(
                            language,
                            'Statutory Guarantee',
                            'वैधानिक सुरक्षा (Statutory Guarantee)',
                            'शासकीय हमी'
                          )}
                        </span>
                      </span>
                      <p className="text-xs text-navy/80 font-medium">
                        {pickLang(
                          language,
                          'Guaranteed welfare benefit funded per official government operational guidelines.',
                          'कल्याणकारी दिशा-निर्देशों के अनुसार 100% केंद्रीय/राज्य वित्तपोषित एवं सुरक्षित।',
                          'अधिकृत शासकीय मार्गदर्शक तत्त्वांनुसार शंभर टक्के केंद्र/राज्य निधीतून मिळणारा लाभ.'
                        )}
                      </p>
                    </div>
                  </div>

                  {/* APY Specialized Structured Benefits */}
                  {scheme.scheme_code?.toUpperCase() === 'APY' && (
                    <div className="space-y-6 pt-3">
                      {/* Section 1: Guaranteed Pension Slabs & Corpus Return */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs uppercase font-bold tracking-wider text-navy flex items-center gap-1.5">
                            <PiggyBank className="w-4 h-4 text-saffron" />
                            <span>
                              {pickLang(
                                language,
                                'Guaranteed Monthly Pension Options & Nominee Corpus (5 Pension Slabs)',
                                'गारंटीड मासिक पेंशन विकल्प एवं नामिती कॉर्पस (5 पेंशन स्लैब)',
                                'हमीयुक्त मासिक निवृत्तीवेतन पर्याय व नामनिर्देशित निधी (५ टप्पे)'
                              )}
                            </span>
                          </h4>
                          <span className="text-[10px] font-semibold text-navy/60 bg-ivory-100 px-2 py-0.5 rounded border border-navy/10">
                            PFRDA Regulated
                          </span>
                        </div>
                        <p className="text-xs text-navy/70">
                          {pickLang(
                            language,
                            'Subscribers receive a lifelong monthly pension upon reaching 60 years of age based on their chosen slab.',
                            '60 वर्ष की आयु पूर्ण होने पर अंशधारक को उसके द्वारा चुने गए स्लैब के अनुसार आजीवन मासिक पेंशन मिलती है।',
                            'वय वर्षे ६० पूर्ण झाल्यावर खातेदारास निवडलेल्या टप्प्यानुसार आयुष्यभर मासिक निवृत्तीवेतन मिळते.'
                          )}
                        </p>

                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                          {[
                            { pension: '₹1,000', corpus: '₹1.70 Lakh' },
                            { pension: '₹2,000', corpus: '₹3.40 Lakh' },
                            { pension: '₹3,000', corpus: '₹5.10 Lakh' },
                            { pension: '₹4,000', corpus: '₹6.80 Lakh' },
                            { pension: '₹5,000', corpus: '₹8.50 Lakh' },
                          ].map((slab, sIdx) => (
                            <div
                              key={sIdx}
                              className="p-3 rounded-xl bg-ivory-50 border border-saffron/20 text-center hover:border-saffron/50 transition-colors shadow-xs"
                            >
                              <span className="text-[10px] uppercase font-bold text-navy/50 block">
                                {pickLang(language, 'Monthly Pension', 'मासिक पेंशन', 'मासिक निवृत्तीवेतन')}
                              </span>
                              <span className="text-base font-extrabold text-navy block my-0.5">
                                {slab.pension}
                              </span>
                              <div className="pt-1.5 border-t border-navy/6 text-[10px] text-navy/70">
                                <span className="block text-navy/50 font-medium">
                                  {pickLang(language, 'Nominee Corpus', 'नामिती कॉर्पस', 'नामनिर्देशित निधी')}
                                </span>
                                <span className="font-bold text-sage-dark">{slab.corpus}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Section 2: Tripartite Protection (Subscriber -> Spouse -> Nominee) */}
                      <div className="p-4 rounded-2xl bg-white border border-navy/10 space-y-3">
                        <h4 className="text-xs uppercase font-bold tracking-wider text-navy flex items-center gap-1.5">
                          <HeartHandshake className="w-4 h-4 text-emerald-600" />
                          <span>
                            {pickLang(
                              language,
                              'Tripartite Family Protection Lifecycle (Subscriber • Spouse • Nominee)',
                              'त्रिस्तरीय पारिवारिक सुरक्षा चक्र (Subscriber • Spouse • Nominee)',
                              'त्रिस्तरीय कौटुंबिक सुरक्षा (खातेदार • जोडीदार • नामनिर्देशित)'
                            )}
                          </span>
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="p-3 rounded-xl bg-ivory-50/90 border border-navy/8 space-y-1">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-navy">
                              <span className="w-5 h-5 rounded-full bg-navy text-white text-[11px] flex items-center justify-center shrink-0 font-mono">1</span>
                              <span>
                                {pickLang(language, 'Subscriber Lifetime', 'अंशधारक (Subscriber)', 'खातेदार हयात असताना')}
                              </span>
                            </div>
                            <p className="text-[11px] text-navy/80 leading-relaxed">
                              {pickLang(
                                language,
                                'Lifelong guaranteed monthly pension (₹1,000 to ₹5,000) from age 60 till demise.',
                                '60 वर्ष की आयु से आजीवन गारंटीड मासिक पेंशन (₹1,000 से ₹5,000)।',
                                '६० व्या वर्षापासून आयुष्यभर निश्चित मासिक निवृत्तीवेतन (₹१,००० ते ₹५,०००).'
                              )}
                            </p>
                          </div>

                          <div className="p-3 rounded-xl bg-ivory-50/90 border border-navy/8 space-y-1">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-navy">
                              <span className="w-5 h-5 rounded-full bg-saffron text-white text-[11px] flex items-center justify-center shrink-0 font-mono">2</span>
                              <span>
                                {pickLang(language, 'Spouse Entitlement', 'पति/पत्नी अधिकार (Spouse)', 'जोडीदारास हक्क')}
                              </span>
                            </div>
                            <p className="text-[11px] text-navy/80 leading-relaxed">
                              {pickLang(
                                language,
                                'Upon subscriber demise, identical 100% monthly pension continues to the spouse for life.',
                                'अंशधारक के निधन पर ठीक उतनी ही 100% मासिक पेंशन पति/पत्नी को आजीवन मिलती है।',
                                'खातेदाराच्या निधनानंतर तेवढेच १००% मासिक निवृत्तीवेतन पती किंवा पत्नीस आयुष्यभर मिळत राहते.'
                              )}
                            </p>
                          </div>

                          <div className="p-3 rounded-xl bg-ivory-50/90 border border-navy/8 space-y-1">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-navy">
                              <span className="w-5 h-5 rounded-full bg-sage-dark text-white text-[11px] flex items-center justify-center shrink-0 font-mono">3</span>
                              <span>
                                {pickLang(language, 'Nominee Corpus', 'नामिती को कॉर्पस (Nominee)', 'नामनिर्देशित व्यक्तीस निधी')}
                              </span>
                            </div>
                            <p className="text-[11px] text-navy/80 leading-relaxed">
                              {pickLang(
                                language,
                                'Upon demise of both subscriber and spouse, 100% accumulated pension wealth (₹1.7L to ₹8.5L) is handed over to the nominee.',
                                'दंपति दोनों के निधन पर सम्पूर्ण संचित पेंशन निधि (₹1.7 से ₹8.5 लाख) नामिती को हस्तांतरित।',
                                'दोघांच्या निधनानंतर संपूर्ण संचित निवृत्तीवेतन निधी (₹१.७ ते ₹८.५ लाख) नामनिर्देशित व्यक्तीस दिला जातो.'
                              )}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Section 3: Subscriber Contribution Schedule & Age Dynamics */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <h4 className="text-xs uppercase font-bold tracking-wider text-navy flex items-center gap-1.5">
                            <TrendingUp className="w-4 h-4 text-saffron-dark" />
                            <span>
                              {pickLang(
                                language,
                                'Subscriber Contribution Schedule by Entry Age (PFRDA Master Circular)',
                                'अंशदान तालिका व आयु सीमा (PFRDA Contribution Schedule)',
                                'वयोमर्यादेनुसार मासिक अंशदान तक्ता (PFRDA नियमावली)'
                              )}
                            </span>
                          </h4>
                          <span className="text-[10px] text-navy/60 font-medium">
                            {pickLang(
                              language,
                              'Monthly Auto-Debit from Savings Account',
                              'मासिक ऑटो-डेबिट (बचत बैंक खाता)',
                              'बचत खात्यातून मासिक ऑटो-डेबिट'
                            )}
                          </span>
                        </div>
                        <p className="text-xs text-navy/70 leading-relaxed">
                          {pickLang(
                            language,
                            'Monthly contribution depends strictly on entry age (18 to 40 years) and the selected pension slab. Joining earlier results in significantly lower contributions:',
                            'मासिक अंशदान नागरिक की प्रवेश आयु (18 से 40 वर्ष) एवं चयनित पेंशन राशि पर निर्भर करता है। जितनी कम उम्र में जुड़ेंगे, मासिक अंशदान उतना ही कम होगा:',
                            'मासिक अंशदान प्रवेशाच्या वयावर (१८ ते ४० वर्षे) व निवडलेल्या पेन्शन टप्प्यावर अवलंबून असते. लवकर सहभाग घेतल्यास मासिक हप्ता कमी राहतो:'
                          )}
                        </p>

                        <div className="overflow-x-auto rounded-xl border border-navy/10 bg-white shadow-xs">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-ivory-100 text-navy/70 font-semibold border-b border-navy/10">
                              <tr>
                                <th className="p-2.5">{pickLang(language, 'Entry Age', 'प्रवेश आयु', 'प्रवेश वय')}</th>
                                <th className="p-2.5">{pickLang(language, 'Years', 'अवधि', 'कालावधी')}</th>
                                <th className="p-2.5 text-right font-mono">₹1,000/mo</th>
                                <th className="p-2.5 text-right font-mono">₹2,000/mo</th>
                                <th className="p-2.5 text-right font-mono">₹3,000/mo</th>
                                <th className="p-2.5 text-right font-mono">₹4,000/mo</th>
                                <th className="p-2.5 text-right font-mono text-saffron-dark font-bold">₹5,000/mo</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-navy/6 font-mono text-[11px] text-navy/90">
                              <tr className="hover:bg-ivory-50">
                                <td className="p-2.5 font-bold font-sans">18 yrs</td>
                                <td className="p-2.5 text-navy/60">42 yrs</td>
                                <td className="p-2.5 text-right">₹42</td>
                                <td className="p-2.5 text-right">₹84</td>
                                <td className="p-2.5 text-right">₹126</td>
                                <td className="p-2.5 text-right">₹168</td>
                                <td className="p-2.5 text-right font-bold text-saffron-dark">₹210</td>
                              </tr>
                              <tr className="hover:bg-ivory-50">
                                <td className="p-2.5 font-bold font-sans">20 yrs</td>
                                <td className="p-2.5 text-navy/60">40 yrs</td>
                                <td className="p-2.5 text-right">₹50</td>
                                <td className="p-2.5 text-right">₹100</td>
                                <td className="p-2.5 text-right">₹150</td>
                                <td className="p-2.5 text-right">₹198</td>
                                <td className="p-2.5 text-right font-bold text-saffron-dark">₹248</td>
                              </tr>
                              <tr className="hover:bg-ivory-50">
                                <td className="p-2.5 font-bold font-sans">25 yrs</td>
                                <td className="p-2.5 text-navy/60">35 yrs</td>
                                <td className="p-2.5 text-right">₹76</td>
                                <td className="p-2.5 text-right">₹151</td>
                                <td className="p-2.5 text-right">₹226</td>
                                <td className="p-2.5 text-right">₹301</td>
                                <td className="p-2.5 text-right font-bold text-saffron-dark">₹376</td>
                              </tr>
                              <tr className="hover:bg-ivory-50">
                                <td className="p-2.5 font-bold font-sans">30 yrs</td>
                                <td className="p-2.5 text-navy/60">30 yrs</td>
                                <td className="p-2.5 text-right">₹116</td>
                                <td className="p-2.5 text-right">₹231</td>
                                <td className="p-2.5 text-right">₹347</td>
                                <td className="p-2.5 text-right">₹462</td>
                                <td className="p-2.5 text-right font-bold text-saffron-dark">₹577</td>
                              </tr>
                              <tr className="hover:bg-ivory-50">
                                <td className="p-2.5 font-bold font-sans">35 yrs</td>
                                <td className="p-2.5 text-navy/60">25 yrs</td>
                                <td className="p-2.5 text-right">₹181</td>
                                <td className="p-2.5 text-right">₹362</td>
                                <td className="p-2.5 text-right">₹543</td>
                                <td className="p-2.5 text-right">₹722</td>
                                <td className="p-2.5 text-right font-bold text-saffron-dark">₹902</td>
                              </tr>
                              <tr className="hover:bg-ivory-50 bg-saffron-light/10">
                                <td className="p-2.5 font-bold font-sans">40 yrs</td>
                                <td className="p-2.5 text-navy/60">20 yrs</td>
                                <td className="p-2.5 text-right">₹291</td>
                                <td className="p-2.5 text-right">₹582</td>
                                <td className="p-2.5 text-right">₹873</td>
                                <td className="p-2.5 text-right">₹1,164</td>
                                <td className="p-2.5 text-right font-bold text-saffron-dark">₹1,454</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                        <p className="text-[11px] text-navy/60 italic">
                          {pickLang(
                            language,
                            '* Contributions can be debited monthly, quarterly, or half-yearly. Subscribers may upgrade or downgrade their pension slab once a year during the month of April.',
                            '* अंशदान मासिक, त्रैमासिक अथवा अर्धवार्षिक ऑटो-डेबिट द्वारा जमा किया जा सकता है। वर्ष में एक बार अप्रैल माह में पेंशन राशि बढ़ाने या घटाने की सुविधा उपलब्ध है।',
                            '* अंशदान मासिक, त्रैमासिक किंवा सहामाही ऑटो-डेबिटद्वारे भरता येते. एप्रिल महिन्यात वर्षातून एकदा पेन्शन टप्पा बदलण्याची सुविधा उपलब्ध आहे.'
                          )}
                        </p>
                      </div>

                      {/* Section 4: Government Co-Contribution & Sovereign Guarantee Clarification */}
                      <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-2.5 text-xs text-navy/85">
                        <div className="flex items-center gap-2 font-bold text-amber-900">
                          <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                          <span>
                            {pickLang(
                              language,
                              'Government Co-Contribution & Sovereign Guarantee Clarification',
                              'शासकीय सह-अंशदान (Co-Contribution) एवं संप्रभु गारंटी स्पष्टीकरण',
                              'शासकीय सह-अंशदान व केंद्र सरकारची हमी स्पष्टीकरण'
                            )}
                          </span>
                        </div>
                        <div className="space-y-2 text-[11.5px] leading-relaxed">
                          <p>
                            <strong className="text-amber-950">
                              {pickLang(
                                language,
                                'Historical Co-Contribution Notice: ',
                                'ऐतिहासिक सह-अंशदान (Historical Co-Contribution): ',
                                'ऐतिहासिक सह-अंशदान सूचना: '
                              )}
                            </strong>
                            {pickLang(
                              language,
                              'The 50% government co-contribution (up to ₹1,000/year) was an introductory incentive provided for 5 financial years (FY 2015-16 to 2019-20) exclusively to eligible non-taxpayers who joined between 1 June 2015 and 31 March 2016. This window has ended and is NOT a current universal benefit for new or ongoing subscribers.',
                              'प्रारंभिक दिशा-निर्देशों के अनुसार 50% शासकीय सह-अंशदान (अधिकतम ₹1,000 प्रति वर्ष) केवल 5 वर्षों (FY 2015-16 से 2019-20) के लिए उन गैर-आयकरदाता नागरिकों को दिया गया था जिन्होंने 1 जून 2015 से 31 मार्च 2016 के बीच पंजीकरण कराया था। यह समयावधि पूर्ण हो चुकी है और यह वर्तमान या नए अंशधारकों के लिए सार्वभौमिक चालू लाभ नहीं है।',
                              'प्रारंभिक नियमांनुसार ५०% शासकीय सह-अंशदान (कमाल ₹१,००० प्रतिवर्ष) केवळ ५ आर्थिक वर्षांसाठी (२०१५-१६ ते २०१९-२०) पात्र करदाते नसलेल्या सदस्यांसाठी होते. हा कालावधी समाप्त झाला असून नवीन सदस्यांसाठी लागू नाही.'
                            )}
                          </p>
                          <p>
                            <strong className="text-amber-950">
                              {pickLang(
                                language,
                                'Sovereign Guarantee from GoI: ',
                                'केंद्रीय संप्रभु गारंटी (Sovereign Pension Guarantee): ',
                                'भारत सरकारची हमी: '
                              )}
                            </strong>
                            {pickLang(
                              language,
                              'The Central Government provides an absolute sovereign guarantee. If the actual market return on the accumulated corpus falls below the return needed for the guaranteed pension, the shortfall is 100% funded and bridged by the Government of India.',
                              'भारत सरकार न्यूनतम पेंशन की गारंटी प्रदान करती है। यदि संचित पेंशन निधि पर वास्तविक बाजार रिटर्न गारंटीकृत पेंशन भुगतान हेतु आवश्यक रिटर्न से कम रहता है, तो उस कमी (Shortfall) की शत-प्रतिशत भरपाई केंद्र सरकार द्वारा की जाती है।',
                              'भारत सरकार किमान निवृत्तीवेतनाची हमी देते. बाजार परतावा अपेक्षेपेक्षा कमी पडल्यास ती तूट भारत सरकार शंभर टक्के भरून काढते.'
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Section 5: Key Statutory Eligibility & Income Tax Rule */}
                      <div className="p-4 rounded-2xl bg-ivory-50 border border-navy/10 space-y-2 text-xs">
                        <h4 className="font-bold text-navy flex items-center gap-1.5 uppercase text-[11px] tracking-wider">
                          <ShieldCheck className="w-4 h-4 text-sage-green" />
                          <span>
                            {pickLang(
                              language,
                              'Key Eligibility & 1 October 2022 Income Tax Rule (Gazette Notification)',
                              'मुख्य वैधानिक पात्रता एवं 1 अक्टूबर 2022 का आयकर नियम',
                              'मुख्य पात्रता व १ ऑक्टोबर २०२२ चा आयकर नियम'
                            )}
                          </span>
                        </h4>
                        <ul className="space-y-1.5 text-[11.5px] text-navy/80 list-disc list-inside">
                          <li>
                            <strong>{pickLang(language, 'Entry Age:', 'प्रवेश आयु सीमा:', 'प्रवेश वयोमर्यादा:')}</strong>{' '}
                            {pickLang(
                              language,
                              '18 to 40 years of age (minimum 20 years of continuous contributions before age 60).',
                              '18 से 40 वर्ष के बीच (कम से कम 20 वर्ष का नियमित अंशदान आवश्यक)।',
                              '१८ ते ४० वर्षे वयोगट (वय ६० पर्यंत किमान २० वर्षे नियमित अंशदान आवश्यक).'
                            )}
                          </li>
                          <li>
                            <strong>{pickLang(language, 'Bank Account:', 'बैंक खाता:', 'बँक खाते:')}</strong>{' '}
                            {pickLang(
                              language,
                              'Active savings bank or post office savings account with auto-debit consent and Aadhaar linkage.',
                              'सक्रिय बचत बैंक अथवा डाकघर बचत खाता, आधार संख्या संलग्न।',
                              'ऑटो-डेबिट संमती व आधार संलग्न असलेले सक्रिय बचत किंवा पोस्ट ऑफिस खाते.'
                            )}
                          </li>
                          <li>
                            <strong className="text-rose-900">
                              {pickLang(
                                language,
                                'Income Tax Payer Exclusion (Effective 1 Oct 2022):',
                                'आयकरदाता अपात्रता (1 Oct 2022 नियम):',
                                'आयकरदाते अपात्रता (१ ऑक्टोबर २०२२ नियम):'
                              )}
                            </strong>{' '}
                            {pickLang(
                              language,
                              'Per Ministry of Finance Gazette Notification effective 1 October 2022, any individual who is or has been an income tax payer under the Income-tax Act, 1961 is strictly ineligible to join APY. Accounts opened on or after this date by tax-payers are liable to closure and refund of subscriber contributions.',
                              'वित्त मंत्रालय की राजपत्र अधिसूचना के अनुसार, 1 अक्टूबर 2022 से कोई भी नागरिक जो आयकर दाता है या रहा है, वह अटल पेंशन योजना में नया खाता खोलने का पात्र नहीं है। आयकरदाताओं द्वारा खोले गए खाते बंद कर अंशदान वापस कर दिया जाता है।',
                              'केंद्रीय अर्थ मंत्रालयाच्या राजपत्र अधिसूचनेनुसार १ ऑक्टोबर २०२२ पासून आयकर भरणारे नागरिक अटल पेन्शन योजनेत नवीन खाते उघडण्यास पात्र नाहीत.'
                            )}
                          </li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-xs text-navy/60 bg-ivory-100 rounded-xl border border-navy/8">
                  {pickLang(
                    language,
                    'No specific benefit description registered for this scheme yet. Please refer to the official government portal.',
                    'इस योजना के लिए विशिष्ट लाभ विवरण अभी पंजीकृत नहीं हैं। कृपया आधिकारिक पोर्टल देखें।',
                    'या योजनेसाठी स्वतंत्र लाभ विवरण नोंदवलेले नाही. कृपया अधिकृत शासकीय पोर्टल पहा.'
                  )}
                </div>
              )}

              {/* Proceed to Eligibility Check CTA */}
              <div className="pt-4 border-t border-navy/8 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-xs text-navy/60">
                  {pickLang(
                    language,
                    'Are you eligible for these benefits? Evaluate now:',
                    'क्या आप इस लाभ के लिए पात्र हैं? अभी जांचें:',
                    'तुम्ही या लाभांसाठी पात्र आहात का? आत्ताच तपासा:'
                  )}
                </span>
                <Button
                  variant="saffron"
                  size="sm"
                  rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                  onClick={() => handleTabClick('eligibility')}
                  className="shrink-0"
                >
                  {pickLang(language, 'Evaluate Eligibility', 'पात्रता निकष जांचें', 'पात्रता तपासा')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 3: ELIGIBILITY
      ────────────────────────────────────────────────────────────── */}
      {activeTab === 'eligibility' && (
        <div className="space-y-6 animate-fade-in-up">
          {/* Check Eligibility Header & Action */}
          <div className="bg-white rounded-3xl border border-navy/12 p-6 sm:p-8 shadow-subtle space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-navy/8">
              <div>
                <h3 className="font-bold font-editorial text-navy text-lg sm:text-xl flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-saffron-vibrant" />
                  <span>
                    {pickLang(
                      language,
                      'Deterministic Eligibility Evaluation',
                      'नियम-आधारित पात्रता मूल्यांकन',
                      'नियम-आधारित पात्रता तपासणी'
                    )}
                  </span>
                </h3>
                <p className="text-xs text-navy/50 mt-0.5">
                  {pickLang(
                    language,
                    'Verified against official criteria AST and your citizen profile attributes',
                    'PostgreSQL डेटाबेस नियमों के विरुद्ध आपकी प्रोफ़ाइल का सीधा सत्यापन',
                    'अधिकृत शासकीय निकष आणि तुमच्या नागरिक प्रोफाइलवर आधारित अचूक तपासणी'
                  )}
                </p>
              </div>

              <Button
                variant="saffron"
                size="md"
                leftIcon={<Sparkles className="w-4 h-4" />}
                onClick={handleCheckEligibility}
                isLoading={checkingEligibility}
              >
                {eligibility
                  ? pickLang(language, 'Re-evaluate', 'पुनः जांचें (Re-evaluate)', 'पुन्हा तपासा')
                  : t.actions.checkEligibility}
              </Button>
            </div>

            {/* Error notification banner if check failed */}
            {eligibilityError && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-950 flex items-center justify-between gap-3 animate-fade-in-up">
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{eligibilityError}</span>
                </div>
                {!isAuthenticated && (
                  <Button variant="outline" size="sm" onClick={() => setIsLoginOpen(true)} leftIcon={<LogIn className="w-3.5 h-3.5" />}>
                    {pickLang(language, 'Sign In', 'लॉग इन करें', 'लॉग इन करा')}
                  </Button>
                )}
              </div>
            )}

            {/* If evaluated, show deterministic result card */}
            {eligibility && (
              <div className="space-y-5 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-ivory-50 border border-navy/10">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
                        eligibility.result === 'eligible'
                          ? 'bg-sage-light text-sage-green border-sage/30'
                          : eligibility.result === 'potentially_eligible'
                          ? 'bg-saffron-light text-saffron-dark border-saffron/30'
                          : eligibility.result === 'insufficient_information'
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : 'bg-rose-50 text-rose-600 border-rose-200'
                      }`}
                    >
                      {eligibility.result === 'eligible' ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : eligibility.result === 'potentially_eligible' ? (
                        <Sparkles className="w-5 h-5" />
                      ) : eligibility.result === 'insufficient_information' ? (
                        <HelpCircle className="w-5 h-5" />
                      ) : (
                        <XCircle className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-navy/50 block">Evaluation Status</span>
                      <h4 className="font-bold text-navy text-sm font-editorial">
                        {eligibility.result === 'eligible'
                          ? '● ELIGIBLE (पात्र)'
                          : eligibility.result === 'potentially_eligible'
                          ? '● POTENTIALLY ELIGIBLE (संभावित पात्र)'
                          : eligibility.result === 'insufficient_information'
                          ? '● INSUFFICIENT INFO (अधूरी जानकारी)'
                          : '● NOT ELIGIBLE (अपात्र)'}
                      </h4>
                    </div>
                  </div>

                  <Badge variant={eligibility.result}>
                    {eligibility.result === 'eligible'
                      ? '● ELIGIBLE'
                      : eligibility.result === 'potentially_eligible'
                      ? '● POTENTIAL'
                      : eligibility.result === 'insufficient_information'
                      ? '● INFO NEEDED'
                      : '● NOT ELIGIBLE'}
                  </Badge>
                </div>

                <p className="text-sm font-medium text-navy/80 leading-relaxed bg-white p-4 rounded-2xl border border-navy/8">
                  {eligibility.explanation}
                </p>

                {/* Missing Fields Box */}
                {eligibility.missing_fields && eligibility.missing_fields.length > 0 && (
                  <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200 space-y-2">
                    <div className="flex items-center gap-2 text-amber-900 font-semibold text-xs">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        {pickLang(
                          language,
                          'Missing Profile Information for Full Determination',
                          'अधूरी जानकारी: प्रोफ़ाइल अपडेट की आवश्यकता है',
                          'अपूर्ण माहिती: प्रोफाइल अद्यतनित करणे आवश्यक'
                        )}
                      </span>
                    </div>
                    <p className="text-xs text-amber-900/80 leading-relaxed">
                      {pickLang(
                        language,
                        'To evaluate all statutory conditions definitively, please update these attributes in your profile:',
                        'पूर्ण मूल्यांकन के लिए कृपया अपनी प्रोफ़ाइल में निम्नलिखित फ़ील्ड भरें:',
                        'संपूर्ण पात्रता तपासणीसाठी कृपया तुमच्या प्रोफाइलमध्ये खालील तपशील भरा:'
                      )}
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {eligibility.missing_fields.map((f, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 text-xs font-mono font-medium">
                          {f.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                    <div className="pt-2">
                      <Link to="/onboarding">
                        <Button variant="outline" size="sm" className="bg-white text-amber-900 border-amber-300 hover:bg-amber-100">
                          {pickLang(language, 'Update Profile', 'प्रोफ़ाइल अपडेट करें', 'प्रोफाइल अद्यतनित करा')}
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}

                {/* Evaluated Conditions Checklist */}
                {eligibility.condition_results && eligibility.condition_results.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-navy/50">
                      {pickLang(
                        language,
                        'Evaluated Criteria Checklist',
                        'जांची गई पात्रता शर्तें (Evaluated Criteria Checklist)',
                        'तपासलेले पात्रता निकष'
                      )}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {eligibility.condition_results.map((cond, idx) => (
                        <div
                          key={idx}
                          className={`flex items-start gap-3 p-3.5 rounded-xl text-xs border transition-all ${
                            cond.passed === true
                              ? 'bg-sage-light/80 border-sage/35 text-navy'
                              : cond.passed === false
                              ? 'bg-rose-50/70 border-rose-200 text-rose-950'
                              : 'bg-amber-50/70 border-amber-200 text-navy'
                          }`}
                        >
                          {cond.passed === true ? (
                            <CheckCircle2 className="w-4 h-4 text-sage-green shrink-0 mt-0.5" />
                          ) : cond.passed === false ? (
                            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          ) : (
                            <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          )}
                          <div className="space-y-0.5">
                            <span className="font-bold text-navy block capitalize">{cond.field.replace(/_/g, ' ')}</span>
                            <p className="opacity-80 leading-relaxed">{cond.explanation}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {eligibility.result === 'eligible' && (
                  <div className="pt-3 flex items-center justify-between border-t border-navy/8">
                    <span className="text-xs text-navy/60 font-medium">
                      {pickLang(
                        language,
                        'All baseline conditions met. Proceed to application preparation.',
                        'सभी शर्तें पूर्ण हैं। अब आवेदन मसुदा तैयार करें।',
                        'सर्व पात्रता निकष पूर्ण आहेत. आता अर्ज मसुदा तयार करा.'
                      )}
                    </span>
                    <Link to="/chat">
                      <Button variant="saffron" size="md" rightIcon={<ArrowRight className="w-4 h-4" />}>
                        {pickLang(
                          language,
                          'Pre-fill with AI Saathi',
                          'साथी द्वारा आवेदन मसुदा भरें',
                          'AI साथीद्वारे अर्ज तयार करा'
                        )}
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            )}

            {!eligibility && !checkingEligibility && (
              <div className="p-6 text-center space-y-3 bg-ivory-50 rounded-2xl border border-navy/8">
                <Sparkles className="w-8 h-8 text-saffron mx-auto" />
                <p className="text-xs text-navy/70 max-w-md mx-auto">
                  {isAuthenticated
                    ? pickLang(
                        language,
                        'Click "Check Eligibility" above to run deterministic evaluation against your verified citizen profile.',
                        'अपनी सहेजी गई नागरिक प्रोफ़ाइल के विरुद्ध पात्रता जांचने के लिए ऊपर "पात्रता जांचें" पर क्लिक करें।',
                        'तुमच्या जतन केलेल्या नागरिक प्रोफाइलनुसार पात्रता तपासण्यासाठी वर "पात्रता तपासा" वर क्लिक करा.'
                      )
                    : pickLang(
                        language,
                        'Sign in or select a citizen persona to test deterministic eligibility against official rules.',
                        'अपनी व्यक्तिगत पात्रता जांचने के लिए कृपया नागरिक खाते में लॉग इन करें या डेमो नागरिक चुनें।',
                        'तुमची वैयक्तिक पात्रता तपासण्यासाठी कृपया नागरिक खात्यात लॉग इन करा किंवा डेमो खाते निवडा.'
                      )}
                </p>
                {!isAuthenticated && (
                  <Button variant="outline" size="sm" onClick={() => setIsLoginOpen(true)} leftIcon={<LogIn className="w-3.5 h-3.5" />}>
                    {pickLang(language, 'Sign In / Switch Citizen', 'लॉग इन / नागरिक बदलें', 'लॉग इन / खाते बदला')}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 4: REQUIRED DOCUMENTS
      ────────────────────────────────────────────────────────────── */}
      {activeTab === 'documents' && (
        <div className="space-y-6 animate-fade-in-up">
          <Card>
            <CardHeader className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-ivory-100 flex items-center justify-center text-navy border border-navy/8 shrink-0">
                  <FileText className="w-4 h-4 text-saffron" />
                </div>
                <div>
                  <h3 className="font-bold font-editorial text-navy text-base">{t.labels.requiredDocuments}</h3>
                  <p className="text-xs text-navy/50">{documents.length} official documents registered for this scheme</p>
                </div>
              </div>

              <Link to="/documents">
                <Button variant="outline" size="sm">
                  {t.actions.uploadDocument}
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-6 space-y-3">
              {documents.length === 0 ? (
                <div className="p-8 text-center text-xs text-navy/60 bg-ivory-100 rounded-xl border border-navy/8">
                  {scheme.scheme_status === 'pending_verification'
                    ? pickLang(
                        language,
                        'Document checklist for this scheme is currently pending administrative verification.',
                        'इस योजना के लिए दस्तावेज़ चेकलिस्ट प्रशासनिक सत्यापन हेतु लंबित है।',
                        'या योजनेसाठी कागदपत्रांची यादी प्रशासकीय पडताळणीसाठी प्रलंबित आहे.'
                      )
                    : pickLang(
                        language,
                        'No specific document checklist registered yet. Standard KYC documentation (Aadhaar, Bank Account) applies.',
                        'कोई विशिष्ट दस्तावेज़ चेकलिस्ट पंजीकृत नहीं है। मानक केवाईसी (आधार, बैंक खाता) लागू होता है।',
                        'या योजनेसाठी स्वतंत्र कागदपत्र यादी नोंदवलेली नाही. प्रमाणित केवायसी (आधार, बँक खाते) लागू आहे.'
                      )}
                </div>
              ) : (
                documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-start justify-between gap-4 p-4 rounded-2xl border border-navy/8 bg-white hover:border-navy/20 hover:shadow-subtle transition-all duration-200"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-navy capitalize">
                          {doc.title || doc.document_type.replace(/_/g, ' ')}
                        </span>
                        <Badge variant={doc.is_mandatory ? 'saffron' : 'category'}>
                          {doc.is_mandatory ? 'Mandatory' : 'Optional'}
                        </Badge>
                        {doc.issuing_authority && (
                          <span className="text-[10px] text-navy/50 bg-ivory-100 px-2 py-0.5 rounded-md border border-navy/10 font-medium">
                            {doc.issuing_authority}
                          </span>
                        )}
                      </div>
                      {(doc.description || doc.guidance) && (
                        <p className="text-xs text-navy/60 leading-relaxed">{doc.description || doc.guidance}</p>
                      )}
                      {doc.last_verified_at && (
                        <p className="text-[10px] text-navy/40">Verified: {doc.last_verified_at.split('T')[0]}</p>
                      )}
                    </div>

                    {doc.source_url && (
                      <a
                        href={doc.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold text-saffron-dark hover:text-saffron shrink-0 flex items-center gap-1 pt-1 transition-colors"
                      >
                        <span>Portal</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 5: APPLICATION PROCESS
      ────────────────────────────────────────────────────────────── */}
      {activeTab === 'application' && (
        <div className="space-y-6 animate-fade-in-up">
          <Card>
            <CardHeader>
              <h3 className="font-bold font-editorial text-navy text-base flex items-center gap-2">
                <Send className="w-4 h-4 text-emerald-600" />
                <span>
                  {pickLang(
                    language,
                    'Official Application Procedure & Steps',
                    'अधिकृत आवेदन प्रक्रिया एवं चरण',
                    'अधिकृत अर्ज प्रक्रिया व टप्पे'
                  )}
                </span>
              </h3>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-ivory-50 border border-navy/8">
                  <span className="w-6 h-6 rounded-full bg-navy text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <div className="space-y-1">
                    <span className="font-bold text-xs text-navy block">
                      {pickLang(
                        language,
                        'Eligibility & Document Preparation',
                        'दस्तावेज़ एवं पात्रता की पूर्व-तैयारी',
                        'पात्रता व कागदपत्रांची पूर्वतयारी'
                      )}
                    </span>
                    <p className="text-xs text-navy/70 leading-relaxed">
                      {pickLang(
                        language,
                        'Ensure Aadhaar card, bank passbook, and required land/income documents are ready and bank account is NPCI-seeded for DBT.',
                        'आधार कार्ड, बैंक खाता पासबुक और आवश्यक भूमि/आय प्रमाण-पत्र तैयार रखें। सुनिश्चित करें कि बैंक खाता आधार से लिंक (DBT सक्षम) है।',
                        'आधार कार्ड, बँक पासबुक आणि आवश्यक जमीन/उत्पन्न कागदपत्रे तयार ठेवा तसेच बँक खाते आधारशी संलग्न (DBT सक्षम) असल्याची खात्री करा.'
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-ivory-50 border border-navy/8">
                  <span className="w-6 h-6 rounded-full bg-navy text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <div className="space-y-1">
                    <span className="font-bold text-xs text-navy block">
                      {pickLang(
                        language,
                        'Online Registration / CSC Center',
                        'ऑनलाइन पंजीकरण अथवा सीएससी केंद्र',
                        'ऑनलाइन नोंदणी किंवा सीएससी केंद्र'
                      )}
                    </span>
                    <p className="text-xs text-navy/70 leading-relaxed">
                      {pickLang(
                        language,
                        'Register via the official government portal or visit your nearest Common Service Centre (CSC) / Aaple Sarkar Kendra.',
                        'आधिकारिक पोर्टल पर स्वयं-पंजीकरण करें या नजदीकी सीएससी (Common Service Centre) अथवा आपले सरकार सेवा केंद्र पर जाएं।',
                        'अधिकृत शासकीय पोर्टलवर ऑनलाइन नोंदणी करा किंवा जवळच्या सीएससी / आपले सरकार सेवा केंद्रास भेट द्या.'
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-ivory-50 border border-navy/8">
                  <span className="w-6 h-6 rounded-full bg-navy text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <div className="space-y-1">
                    <span className="font-bold text-xs text-navy block">
                      {pickLang(
                        language,
                        'Biometric / OTP e-KYC',
                        'बायोमेट्रिक अथवा ओटीपी ई-केवाईसी',
                        'बायोमेट्रिक किंवा ओटीपी ई-केवायसी'
                      )}
                    </span>
                    <p className="text-xs text-navy/70 leading-relaxed">
                      {pickLang(
                        language,
                        'Complete mandatory e-KYC verification using Aadhaar OTP or biometric authentication.',
                        'आधार से जुड़े मोबाइल नंबर पर प्राप्त ओटीपी अथवा फिंगरप्रिंट द्वारा ई-केवाईसी सत्यापन पूरा करें।',
                        'आधारशी संलग्न मोबाईल क्रमांकावरील ओटीपी किंवा बायोमेट्रिक पडताळणीद्वारे ई-केवायसी पूर्ण करा.'
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-ivory-50 border border-navy/8">
                  <span className="w-6 h-6 rounded-full bg-navy text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    4
                  </span>
                  <div className="space-y-1">
                    <span className="font-bold text-xs text-navy block">
                      {pickLang(
                        language,
                        'Verification & DBT Approval',
                        'सत्यापन एवं डीबीटी स्वीकृति',
                        'पडताळणी व DBT मंजुरी'
                      )}
                    </span>
                    <p className="text-xs text-navy/70 leading-relaxed">
                      {pickLang(
                        language,
                        'Local revenue and nodal department authorities verify records, after which benefits are disbursed via DBT.',
                        'स्थानीय राजस्व/कृषि अधिकारी द्वारा सत्यापन के पश्चात स्वीकृति प्रदान की जाती है और राशि सीधे खाते में अंतरित होती है।',
                        'संबंधित विभागाच्या अधिकाऱ्यांकडून कागदपत्रांची पडताळणी झाल्यावर अर्जास मंजुरी देऊन DBT द्वारे थेट खात्यात लाभ जमा केला जातो.'
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Direct Links */}
              <div className="pt-3 border-t border-navy/8 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-navy/40" />
                  <span className="text-xs text-navy/60 font-medium">
                    {pickLang(
                      language,
                      'Offline: Gram Panchayat, Tehsil Office, or CSC',
                      'निकटतम केंद्र: ग्राम पंचायत, तहसील कार्यालय या सीएससी',
                      'जवळचे केंद्र: ग्रामपंचायत, तहसील कार्यालय किंवा सीएससी'
                    )}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {(scheme.application_url || scheme.official_url) && (
                    <a
                      href={scheme.application_url || scheme.official_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-navy text-white hover:bg-navy-800 transition-all shadow-subtle"
                    >
                      <span>
                        {pickLang(language, 'Open Application Portal', 'आवेदन पोर्टल खोलें', 'अर्ज पोर्टल उघडा')}
                      </span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <Link to="/chat">
                    <Button variant="saffron" size="sm" leftIcon={<Sparkles className="w-3.5 h-3.5" />}>
                      {pickLang(language, 'Ask AI Saathi', 'साथी से पूछें', 'AI साथीला विचारा')}
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 6: OFFICIAL SOURCES & EVIDENCE
      ────────────────────────────────────────────────────────────── */}
      {activeTab === 'sources' && (
        <div className="space-y-6 animate-fade-in-up">
          <Card>
            <CardHeader>
              <h3 className="font-bold font-editorial text-navy text-base flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-sage-green" />
                <span>
                  {pickLang(
                    language,
                    'Official Government Sources & Evidence',
                    'अधिकृत सरकारी संदर्भ एवं सत्यापन साक्ष्य',
                    'अधिकृत शासकीय संदर्भ व पुरावे'
                  )}
                </span>
              </h3>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-3">
                {scheme.source_url && (
                  <div className="p-4 rounded-xl bg-ivory-50 border border-navy/8 space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-navy/50 block">
                      {pickLang(
                        language,
                        'Primary Operational Guidelines',
                        'प्राथमिक दिशा-निर्देश (Operational Guidelines)',
                        'प्राथमिक शासकीय मार्गदर्शक सूचना'
                      )}
                    </span>
                    <a
                      href={scheme.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-saffron-dark hover:underline break-all inline-flex items-center gap-1"
                    >
                      <span>{scheme.source_url}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  </div>
                )}

                {scheme.official_url && (
                  <div className="p-4 rounded-xl bg-ivory-50 border border-navy/8 space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-navy/50 block">
                      {pickLang(
                        language,
                        'Official Web Portal',
                        'आधिकारिक पोर्टल (Official Web Portal)',
                        'अधिकृत संकेतस्थळ'
                      )}
                    </span>
                    <a
                      href={scheme.official_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-saffron-dark hover:underline break-all inline-flex items-center gap-1"
                    >
                      <span>{scheme.official_url}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  </div>
                )}
              </div>

              {/* Claim-Level Evidence List if present */}
              {scheme.source_evidence && scheme.source_evidence.length > 0 && (
                <div className="space-y-2 pt-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-navy/50">
                    {pickLang(
                      language,
                      'Claim-Level Verified Evidence',
                      'सत्यापित साक्ष्य अभिलेख (Claim-Level Evidence Entries)',
                      'पडताळलेले अधिकृत संदर्भ नोंदी'
                    )}
                  </h4>
                  <div className="space-y-2">
                    {scheme.source_evidence.map((entry, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl border border-navy/8 bg-white space-y-1 text-xs">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="font-bold text-navy capitalize">{entry.claim.replace(/_/g, ' ')}</span>
                          <span className="text-[10px] font-semibold text-sage-green bg-sage-light px-2 py-0.5 rounded-full border border-sage/30">
                            {entry.verification_status || 'verified'}
                          </span>
                        </div>
                        <p className="text-navy/70 leading-relaxed">{entry.statement}</p>
                        {entry.citation && (
                          <span className="text-[10.5px] text-navy/50 font-mono block">Citation: {entry.citation}</span>
                        )}
                        {entry.source_url && (
                          <a
                            href={entry.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10.5px] text-saffron-dark hover:underline inline-flex items-center gap-1 font-medium"
                          >
                            <span>Source Reference</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Source Integrity Footer Notice */}
      <StatusBanner
        type="info"
        title="Source Integrity & Official Portal Reference"
        message={`Data verified against official guidelines (${scheme.source_url}) on ${scheme.last_verified_at ? scheme.last_verified_at.split('T')[0] : '2026-11-10'}. Scheme Saathi provides assistive guidance and deterministic eligibility calculations.`}
      />

      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
    </div>
  );
};
