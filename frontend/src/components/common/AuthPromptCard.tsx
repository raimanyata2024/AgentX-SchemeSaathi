import React from 'react';
import { Lock, AlertTriangle, RefreshCw, LogIn } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { useLanguage } from '@/context/LanguageContext';
import { pickLang } from '@/utils/i18n';

interface AuthPromptCardProps {
  kind: 'auth' | 'network';
  title?: string;
  description?: string;
  errorDetail?: string | null;
  onSignIn?: () => void;
  onRetry?: () => void;
  secondaryAction?: React.ReactNode;
}

export const AuthPromptCard: React.FC<AuthPromptCardProps> = ({
  kind,
  title,
  description,
  errorDetail,
  onSignIn,
  onRetry,
  secondaryAction,
}) => {
  const { language } = useLanguage();

  const resolvedTitle =
    title ||
    (kind === 'auth'
      ? pickLang(
          language,
          'Citizen Sign In Required',
          'नागरिक लॉगिन आवश्यक है',
          'नागरिक लॉगिन आवश्यक आहे'
        )
      : pickLang(
          language,
          'Unable to Reach Server',
          'सर्वर से संपर्क नहीं हो सका',
          'सर्व्हरशी संपर्क होऊ शकला नाही'
        ));

  const resolvedDescription =
    description ||
    (kind === 'auth'
      ? pickLang(
          language,
          'Please sign in with your citizen account or register to access live scheme records, personalized eligibility, and document tools.',
          'सरकारी योजनाओं, व्यक्तिगत पात्रता और दस्तावेज़ सेवाओं का उपयोग करने के लिए कृपया लॉग इन करें या नया नागरिक खाता बनाएं।',
          'शासकीय योजना, वैयक्तिक पात्रता आणि दस्तऐवज सुविधा पाहण्यासाठी कृपया आपल्या नागरिक खात्यात लॉग इन करा किंवा नोंदणी करा.'
        )
      : errorDetail ||
        pickLang(
          language,
          'We encountered a temporary network or server issue while loading data. Please try again.',
          'डेटा लोड करते समय अस्थायी सर्वर या नेटवर्क समस्या आई। कृपया पुनः प्रयास करें।',
          'माहिती लोड करताना तात्पुरती सर्व्हर किंवा नेटवर्क समस्या आली. कृपया पुन्हा प्रयत्न करा.'
        ));

  const isAuth = kind === 'auth';

  return (
    <div
      className={`rounded-3xl border p-8 text-center max-w-xl mx-auto shadow-subtle space-y-4 ${
        isAuth
          ? 'bg-white border-saffron/30'
          : 'bg-amber-50/70 border-amber-200'
      }`}
    >
      <div
        className={`w-12 h-12 rounded-2xl mx-auto flex items-center justify-center ${
          isAuth
            ? 'bg-saffron-light text-saffron-vibrant border border-saffron/25'
            : 'bg-amber-100 text-amber-800 border border-amber-300'
        }`}
      >
        {isAuth ? <Lock className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
      </div>

      <div className="space-y-1.5">
        <h3 className="text-lg font-bold font-editorial text-navy">
          {resolvedTitle}
        </h3>
        <p className="text-xs sm:text-sm text-navy/70 leading-relaxed max-w-md mx-auto">
          {resolvedDescription}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        {isAuth && onSignIn && (
          <Button
            variant="saffron"
            size="md"
            leftIcon={<LogIn className="w-4 h-4" />}
            onClick={onSignIn}
          >
            {pickLang(
              language,
              'Sign In / Register',
              'लॉग इन / नया खाता',
              'लॉग इन / नवीन नोंदणी'
            )}
          </Button>
        )}

        {!isAuth && onRetry && (
          <Button
            variant="saffron"
            size="md"
            leftIcon={<RefreshCw className="w-4 h-4" />}
            onClick={onRetry}
          >
            {pickLang(language, 'Retry', 'पुनः प्रयास करें', 'पुन्हा प्रयत्न करा')}
          </Button>
        )}

        {secondaryAction}
      </div>
    </div>
  );
};
