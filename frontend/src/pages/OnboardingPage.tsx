import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { pickLang } from '@/utils/i18n';
import { profileService } from '@/services/api/profileService';
import { UserProfile } from '@/types';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Select } from '@/components/common/Select';
import { StatusBanner } from '@/components/common/StatusBanner';
import { User, ShieldCheck, Check, AlertCircle } from 'lucide-react';

export const OnboardingPage: React.FC = () => {
  const { profile, updateProfileState } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState<string>('');
  const [dob, setDob] = useState<string>('');
  const [gender, setGender] = useState<string>('male');
  const [stateName, setStateName] = useState<string>('');
  const [district, setDistrict] = useState<string>('');
  const [residenceType, setResidenceType] = useState<"rural" | "urban" | "semi_urban">('rural');
  const [occupation, setOccupation] = useState<string>('farmer');
  const [income, setIncome] = useState<string>('120000');
  const [isLandholdingFarmer, setIsLandholdingFarmer] = useState<boolean>(true);
  const [landHolding, setLandHolding] = useState<string>('1.5');
  const [casteCategory, setCasteCategory] = useState<string>('OBC');
  const [isTaxPayer, setIsTaxPayer] = useState<boolean>(false);

  const [saving, setSaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setDob(profile.date_of_birth || '');
      setGender(profile.gender || 'male');
      setStateName(profile.state || '');
      setDistrict(profile.district || '');
      setResidenceType(profile.residence_type || 'rural');
      setOccupation(profile.occupation || 'farmer');
      setIncome(profile.annual_family_income !== undefined && profile.annual_family_income !== null ? String(profile.annual_family_income) : '');
      if (profile.profile_data) {
        if (profile.profile_data.land_holding_acres !== undefined) {
          setLandHolding(String(profile.profile_data.land_holding_acres));
        }
        if (profile.profile_data.caste_category !== undefined) {
          setCasteCategory(String(profile.profile_data.caste_category));
        }
        if (profile.profile_data.is_landholding_farmer !== undefined) {
          setIsLandholdingFarmer(Boolean(profile.profile_data.is_landholding_farmer));
        }
        if (profile.profile_data.is_income_tax_payer !== undefined) {
          setIsTaxPayer(Boolean(profile.profile_data.is_income_tax_payer));
        }
      }
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage(null);
    setSavedSuccess(false);

    const acresNum = landHolding ? Number(landHolding) : 0;
    const hectaresNum = acresNum > 0 ? Number((acresNum * 0.404686).toFixed(2)) : 0;

    const updatedData: Partial<UserProfile> = {
      full_name: fullName.trim(),
      date_of_birth: dob || undefined,
      gender: gender,
      state: stateName.trim() || undefined,
      district: district.trim() || undefined,
      residence_type: residenceType,
      occupation: occupation || undefined,
      annual_family_income: income ? Number(income) : undefined,
      preferred_language: language,
      profile_data: {
        ...(profile?.profile_data || {}),
        occupation: occupation,
        caste_category: casteCategory.toLowerCase(),
        is_farmer: occupation === 'farmer',
        is_student: occupation === 'student',
        is_artisan: occupation === 'artisan',
        is_landholding_farmer: occupation === 'farmer' ? isLandholdingFarmer : false,
        land_holding_acres: occupation === 'farmer' ? acresNum : 0,
        land_size_hectares: occupation === 'farmer' ? hectaresNum : 0,
        is_income_tax_payer: isTaxPayer,
        is_institutional_landholder: false,
      },
    };

    try {
      const saved = await profileService.updateProfile(updatedData);
      updateProfileState(saved);
      setSavedSuccess(true);
      // Seamless direct transition to Dashboard upon successful completion
      setTimeout(() => {
        navigate('/dashboard');
      }, 800);
    } catch (err: any) {
      console.error('Failed to update profile:', err);
      setErrorMessage(err?.message || 'Failed to save profile. Please ensure you are logged in.');
    } finally {
      setSaving(false);
    }
  };

  const occupations = [
    { value: 'farmer', label: pickLang(language, 'Farmer', 'किसान (Farmer)', 'शेतकरी (Farmer)') },
    { value: 'student', label: pickLang(language, 'Student', 'छात्र / छात्रा (Student)', 'विद्यार्थी (Student)') },
    { value: 'artisan', label: pickLang(language, 'Artisan / Craftsman', 'कारीगर / शिल्पी (Artisan / Craftsman)', 'कारागीर / शिल्पकार') },
    { value: 'daily_wager', label: pickLang(language, 'Daily Wage Laborer', 'दैनिक मजदूर (Daily Wage Laborer)', 'दैनिक मजुरी कामगार') },
    { value: 'self_employed', label: pickLang(language, 'Self-Employed', 'स्व-व्यवसायी / दुकानदार (Self-Employed)', 'स्वयंरोजगार / दुकानदार') },
    { value: 'salaried', label: pickLang(language, 'Salaried Employee', 'वेतनभोगी (Salaried Employee)', 'पगारदार कर्मचारी') },
    { value: 'unemployed', label: pickLang(language, 'Unemployed Youth', 'बेरोजगार (Unemployed Youth)', 'बेरोजगार युवक') },
    { value: 'homemaker', label: pickLang(language, 'Homemaker', 'गृहिणी (Homemaker)', 'गृहिणी') },
  ];

  const casteCategories = [
    { value: 'General', label: 'General / सामान्य' },
    { value: 'OBC', label: 'OBC / अन्य पिछड़ा वर्ग' },
    { value: 'SC', label: 'SC / अनुसूचित जाति' },
    { value: 'ST', label: 'ST / अनुसूचित जनजाति' },
    { value: 'EWS', label: 'EWS / आर्थिक रूप से कमजोर' },
  ];

  const genderOptions = [
    { value: 'male', label: pickLang(language, 'Male', 'पुरुष (Male)', 'पुरुष') },
    { value: 'female', label: pickLang(language, 'Female', 'महिला (Female)', 'महिला') },
    { value: 'transgender', label: pickLang(language, 'Transgender', 'ट्रांसजेंडर (Transgender)', 'तृतीयपंथी') },
    { value: 'other', label: pickLang(language, 'Other', 'अन्य (Other)', 'इतर') },
  ];

  const missingFields: string[] = [];
  if (!fullName.trim()) missingFields.push(pickLang(language, 'Full Name', 'पूरा नाम', 'संपूर्ण नाव'));
  if (!dob) missingFields.push(pickLang(language, 'Date of Birth', 'जन्म तिथि', 'जन्मतारीख'));
  if (!gender) missingFields.push(pickLang(language, 'Gender', 'लिंग', 'लिंग'));
  if (!stateName.trim()) missingFields.push(pickLang(language, 'State', 'राज्य', 'राज्य'));
  if (!district.trim()) missingFields.push(pickLang(language, 'District', 'जिला', 'जिल्हा'));
  if (!income) missingFields.push(pickLang(language, 'Annual Income', 'वार्षिक आय', 'वार्षिक उत्पन्न'));

  return (
    <div className="max-w-2xl mx-auto space-y-7">
      {/* Header */}
      <div className="space-y-1">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-saffron-light text-saffron-dark text-xs font-semibold border border-saffron/30">
          <User className="w-3.5 h-3.5 text-saffron-vibrant" />
          <span>{pickLang(language, 'Citizen Profile', 'नागरिक प्रोफ़ाइल', 'नागरिक प्रोफाइल')}</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold font-editorial text-navy tracking-tight">
          {pickLang(
            language,
            'Citizen Profile & Scheme Criteria',
            'नागरिक विवरण व पात्रता प्रोफाइल',
            'नागरिक माहिती व पात्रता प्रोफाइल'
          )}
        </h1>
        <p className="text-xs sm:text-sm text-navy/60 leading-relaxed">
          {pickLang(
            language,
            'Fill in your baseline details. Scheme Saathi uses this data to evaluate deterministic welfare eligibility under official guidelines.',
            'अपनी मूल जानकारी दर्ज करें। योजना साथी इसके आधार पर केंद्रीय एवं राज्य कल्याण योजनाओं की सटीक पात्रता जांचता है।',
            'तुमची प्राथमिक माहिती भरा. योजना साथी या माहितीच्या आधारे केंद्र व राज्य शासकीय योजनांची अचूक पात्रता तपासते.'
          )}
        </p>
      </div>

      {missingFields.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
          <div className="flex items-center gap-2 font-bold">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              {pickLang(
                language,
                'Incomplete Profile (Required for Scheme Matching)',
                'अधूरी जानकारी (पात्रता जांच हेतु आवश्यक)',
                'अपूर्ण माहिती (पात्रता तपासणीसाठी आवश्यक)'
              )}:
            </span>
          </div>
          <p className="opacity-80">
            {pickLang(
              language,
              `Please provide: ${missingFields.join(', ')}`,
              `कृपया निम्नलिखित फ़ील्ड भरें: ${missingFields.join(', ')}`,
              `कृपया खालील माहिती भरा: ${missingFields.join(', ')}`
            )}
          </p>
        </div>
      )}

      {errorMessage && (
        <StatusBanner
          type="danger"
          title="Error"
          message={errorMessage}
        />
      )}

      {savedSuccess && (
        <StatusBanner
          type="success"
          title="Profile Saved Successfully"
          message={pickLang(
            language,
            'Your profile has been saved. Redirecting to dashboard...',
            'आपकी प्रोफ़ाइल सहेजी गई। डैशबोर्ड पर ले जाया जा रहा है...',
            'तुमचे प्रोफाइल जतन झाले आहे. डॅशबोर्डवर जात आहे...'
          )}
          action={
            <Link to="/dashboard">
              <Button size="sm" variant="outline">
                Dashboard
              </Button>
            </Link>
          }
        />
      )}

      {/* Main Profile Form Card */}
      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <h3 className="font-bold font-editorial text-navy text-lg">
              {pickLang(language, 'Baseline Citizen Attributes', 'मूल नागरिक विवरण', 'प्राथमिक नागरिक तपशील')}
            </h3>
            <p className="text-xs text-navy/50">Used to match welfare guidelines across central & state ministries</p>
          </CardHeader>

          <CardContent className="p-6 sm:p-8 space-y-5">
            {/* Full Name & DOB */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label={pickLang(language, 'Full Name', 'पूरा नाम', 'संपूर्ण नाव')}
                placeholder="e.g. Ramesh Kumar"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />

              <Input
                label={pickLang(
                  language,
                  'Date of Birth (for Age evaluation)',
                  'जन्म तिथि (आयु हेतु)',
                  'जन्मतारीख (वयानुसार तपासणीसाठी)'
                )}
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                required
              />
            </div>

            {/* Gender & Social Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label={pickLang(language, 'Gender', 'लिंग (Gender)', 'लिंग')}
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                options={genderOptions}
              />

              <Select
                label={pickLang(language, 'Social Category / Caste', 'सामाजिक श्रेणी', 'सामाजिक प्रवर्ग')}
                value={casteCategory}
                onChange={(e) => setCasteCategory(e.target.value)}
                options={casteCategories}
              />
            </div>

            {/* State & District */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label={pickLang(language, 'State of Residence', 'राज्य (State)', 'राज्य')}
                placeholder="e.g. Uttar Pradesh or Maharashtra"
                value={stateName}
                onChange={(e) => setStateName(e.target.value)}
                required
              />

              <Input
                label={pickLang(language, 'District', 'जिला (District)', 'जिल्हा')}
                placeholder="e.g. Varanasi or Pune"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                required
              />
            </div>

            {/* Residence Type Radio Buttons */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-navy/70 tracking-wide">
                {pickLang(language, 'Residence Type', 'आवास क्षेत्र (Residence Type)', 'निवास क्षेत्र')}
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {(['rural', 'semi_urban', 'urban'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setResidenceType(type)}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-semibold capitalize transition-all duration-200 ${
                      residenceType === type
                        ? 'bg-navy text-white border-navy shadow-subtle'
                        : 'bg-ivory-100 text-navy/70 border-navy/10 hover:border-navy/25 hover:text-navy'
                    }`}
                  >
                    {type.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Occupation & Annual Income */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label={pickLang(language, 'Primary Occupation', 'व्यवसाय (Occupation)', 'मुख्य व्यवसाय')}
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                options={occupations}
              />

              <Input
                label={pickLang(
                  language,
                  'Annual Family Income (₹)',
                  'वार्षिक पारिवारिक आय (₹)',
                  'वार्षिक कौटुंबिक उत्पन्न (₹)'
                )}
                type="number"
                placeholder="e.g. 120000"
                value={income}
                onChange={(e) => setIncome(e.target.value)}
                helperText="Total household annual earnings"
                required
              />
            </div>

            {/* Conditional Farmer Fields */}
            {occupation === 'farmer' && (
              <div className="p-4 rounded-2xl bg-sage-light/60 border border-sage/30 space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-navy/70 block">
                  {pickLang(
                    language,
                    'Agricultural Landholding Details',
                    'कृषि भूमि विवरण (Farmer Status & Landholding)',
                    'शेतजमीन धारणा तपशील'
                  )}
                </span>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="is_landholder"
                    checked={isLandholdingFarmer}
                    onChange={(e) => setIsLandholdingFarmer(e.target.checked)}
                    className="w-4 h-4 rounded text-saffron focus:ring-saffron"
                  />
                  <label htmlFor="is_landholder" className="text-xs font-semibold text-navy">
                    {pickLang(
                      language,
                      'Do you own cultivable agricultural land?',
                      'क्या आपके या आपके परिवार के नाम पर कृषि योग्य भूमि है?',
                      'तुमच्या किंवा कुटुंबाच्या नावावर लागवडीयोग्य शेतजमीन आहे का?'
                    )}
                  </label>
                </div>

                {isLandholdingFarmer && (
                  <Input
                    label={pickLang(
                      language,
                      'Total Cultivable Land Owned (Acres)',
                      'कृषि भूमि का आकार (एकड़)',
                      'एकूण शेतजमीन (एकर)'
                    )}
                    type="number"
                    step="0.1"
                    placeholder="e.g. 1.5"
                    value={landHolding}
                    onChange={(e) => setLandHolding(e.target.value)}
                    helperText="1 acre ≈ 0.40 hectares (PM-KISAN/PM-KMY limit is 2.0 hectares / 5 acres)"
                  />
                )}
              </div>
            )}

            {/* Income Tax Payer Exclusion Checkbox */}
            <div className="flex items-center gap-3 pt-2">
              <input
                type="checkbox"
                id="is_taxpayer"
                checked={isTaxPayer}
                onChange={(e) => setIsTaxPayer(e.target.checked)}
                className="w-4 h-4 rounded text-saffron focus:ring-saffron"
              />
              <label htmlFor="is_taxpayer" className="text-xs text-navy/70">
                {pickLang(
                  language,
                  'Did you or any member of your household pay Income Tax in the last assessment year?',
                  'क्या आपने या परिवार के किसी सदस्य ने पिछले वर्ष आयकर (Income Tax) का भुगतान किया?',
                  'मागील वर्षी तुम्ही किंवा कुटुंबातील कोणीही आयकर भरला आहे का?'
                )}
              </label>
            </div>
          </CardContent>

          <CardFooter className="p-6 bg-ivory/60 border-t border-navy/8 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-navy/50">
              <ShieldCheck className="w-4 h-4 text-sage" />
              <span>Saved in Secure PostgreSQL Database</span>
            </div>

            <Button
              type="submit"
              variant="saffron"
              size="md"
              leftIcon={<Check className="w-4 h-4" />}
              isLoading={saving}
            >
              {pickLang(
                language,
                'Save Profile & Continue',
                'प्रोफ़ाइल सहेजें व आगे बढ़ें',
                'प्रोफाइल जतन करून पुढे जा'
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};
