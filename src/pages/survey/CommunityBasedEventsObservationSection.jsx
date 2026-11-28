import React from 'react'
import styles from "./survey.module.css";
import {
    TextField,
    RadioGroup,
    FormControlLabel,
    Radio,
    Grid,
    Typography,
    FormGroup,
    Checkbox,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import { styled } from '@mui/material/styles';
import { useSectionDraft, useDraftField } from './rmc/sectionDraft';
import { CBE_THEME_OTHER_MAX, LONG_NOTE_MAX, otherDetailError, noteError } from './rmc/rmcLimits';
import { textLength } from 'utils/textLimits';

// Styled components for better section styling
const StyledDetails = styled('details')(({ theme }) => ({
    marginBottom: theme.spacing(3),
    padding: theme.spacing(1),
    borderRadius: theme.spacing(1),
    backgroundColor: '#f9f9f9',
    '&[open]': {
        paddingBottom: theme.spacing(2),
    },
    '& summary': {
        cursor: 'pointer',
        padding: theme.spacing(1),
        fontWeight: 'bold',
        fontSize: '1.05rem',
        backgroundColor: '#e8f4fd',
        borderRadius: theme.spacing(0.5),
        marginBottom: theme.spacing(2),
        '&:hover': {
            backgroundColor: '#d5e8f6',
        },
    }
}));

const blank = (v) => !v || String(v).trim() === '';

const CommunityBasedEventsObservationSection = React.forwardRef((props, ref) => {
    const { t } = useTranslation();
    const [showValidation, setShowValidation] = React.useState(false);

    const sectionDraft = useSectionDraft(ref, props, { triggerValidation: () => triggerValidation() });

    // State management for multiple selections and "Others" options (restored from a draft when present)
    const [themeOfCbe, setThemeOfCbe] = useDraftField(sectionDraft, 'themeOfCbe', '');
    const [themeOfCbeOther, setThemeOfCbeOther] = useDraftField(sectionDraft, 'themeOfCbeOther', '');
    const [typeOfBeneficiaryAttendedCbe, setTypeOfBeneficiaryAttendedCbe] = useDraftField(sectionDraft, 'typeOfBeneficiaryAttendedCbe', []);
    const [typeOfBeneficiaryAttendedCbeOther, setTypeOfBeneficiaryAttendedCbeOther] = useDraftField(sectionDraft, 'typeOfBeneficiaryAttendedCbeOther', '');
    const [serviceProvidersPresentCbe, setServiceProvidersPresentCbe] = useDraftField(sectionDraft, 'serviceProvidersPresentCbe', []);
    const [serviceProvidersPresentCbeOther, setServiceProvidersPresentCbeOther] = useDraftField(sectionDraft, 'serviceProvidersPresentCbeOther', '');
    const [counsellingTopicsCbe, setCounsellingTopicsCbe] = useDraftField(sectionDraft, 'counsellingTopicsCbe', []);
    const [counsellingTopicsCbeOther, setCounsellingTopicsCbeOther] = useDraftField(sectionDraft, 'counsellingTopicsCbeOther', '');
    const [counsellingAidsUsed, setCounsellingAidsUsed] = useDraftField(sectionDraft, 'counsellingAidsUsed', []);
    const [counsellingAidsUsedOther, setCounsellingAidsUsedOther] = useDraftField(sectionDraft, 'counsellingAidsUsedOther', '');
    const [groupCounsellingConducted, setGroupCounsellingConducted] = useDraftField(sectionDraft, 'groupCounsellingConducted', '');
    const [otherImportantObservation, setOtherImportantObservation] = useDraftField(sectionDraft, 'otherImportantObservation', '');

    // Field-level problems (P02: Other text required; F05: stored length limits).
    const themeOtherLengthError = themeOfCbe === 'Others' ? otherDetailError(themeOfCbeOther, CBE_THEME_OTHER_MAX) : null;
    const observationLengthError = noteError(otherImportantObservation, LONG_NOTE_MAX);
    const fieldProblems = () => {
        const problems = {};
        if (blank(themeOfCbe)) problems.themeOfCbe = t('validationRequiredField') || 'This field is required';
        if (themeOfCbe === 'Others' && blank(themeOfCbeOther)) problems.themeOfCbeOther = 'Please specify the other theme';
        if (themeOtherLengthError) problems.themeOfCbeOther = themeOtherLengthError;
        if (typeOfBeneficiaryAttendedCbe.length === 0) problems.typeOfBeneficiaryAttendedCbe = t('validationPleaseSelectAtLeastOne') || 'Please select at least one option';
        if (typeOfBeneficiaryAttendedCbe.includes('others') && blank(typeOfBeneficiaryAttendedCbeOther)) problems.typeOfBeneficiaryAttendedCbeOther = 'Please specify the other beneficiary type';
        if (serviceProvidersPresentCbe.length === 0) problems.serviceProvidersPresentCbe = t('validationPleaseSelectAtLeastOne') || 'Please select at least one option';
        if (serviceProvidersPresentCbe.includes('others') && blank(serviceProvidersPresentCbeOther)) problems.serviceProvidersPresentCbeOther = 'Please specify the other service provider';
        if (blank(groupCounsellingConducted)) problems.groupCounsellingConducted = t('validationRequiredField') || 'This field is required';
        if (groupCounsellingConducted === 'Yes') {
            if (counsellingTopicsCbe.length === 0) problems.counsellingTopicsCbe = t('validationPleaseSelectAtLeastOne') || 'Please select at least one option';
            if (counsellingTopicsCbe.includes('others') && blank(counsellingTopicsCbeOther)) problems.counsellingTopicsCbeOther = 'Please specify the other topic';
            if (counsellingAidsUsed.length === 0) problems.counsellingAidsUsed = t('validationPleaseSelectAtLeastOne') || 'Please select at least one option';
            if (counsellingAidsUsed.includes('others') && blank(counsellingAidsUsedOther)) problems.counsellingAidsUsedOther = 'Please specify the other counselling aid';
        }
        if (observationLengthError) problems.otherImportantObservation = observationLengthError;
        return problems;
    };
    const problems = showValidation ? fieldProblems() : {};
    // Length problems are shown while typing, not only after Submit.
    const lengthProblem = (field) => (field === 'themeOfCbeOther' ? themeOtherLengthError : field === 'otherImportantObservation' ? observationLengthError : null);
    const problemFor = (field) => problems[field] || lengthProblem(field);
    const renderProblem = (field) => (problemFor(field)
        ? <Typography variant="caption" sx={{ color: '#d32f2f', fontSize: '0.75rem', mt: 0.5, display: 'block' }}>{problemFor(field)}</Typography>
        : null);

    // Called by the page before it reads the answers.
    function triggerValidation() {
        setShowValidation(true);
        const found = fieldProblems();
        const first = Object.keys(found)[0];
        if (first) {
            setTimeout(() => {
                const el = document.querySelector(`#cbeForm [name="${first}"]`);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
            }, 100);
            return false;
        }
        return true;
    }

    // Define arrays with translation keys
    const beneficiaryTypes = [
        'pregnantWomen',
        'lactatingWomen',
        'infants6To8MonthsAndMothers',
        'infants9To12MonthsAndMothers',
        'mothersOfChildren1To3Years',
        'mothersOfChildren3To6Years',
        'elderWomenInLaws',
        'husbandsOfChildren',
        'otherMaleMembers',
        'others'
    ];

    const serviceProviders = [
        'asha',
        'anm',
        'others'
    ];

    const counsellingTopics = [
        'breastfeedingImportance',
        'breastfeedingFrequency',
        'breastfeedingPositionAttachment',
        'breastfeedingSignsAdequateFeeding',
        'importanceExclusiveBreastfeeding',
        'complementaryFeedingWhenToStart',
        'complementaryFeedingFrequency',
        'complementaryFeedingConsistency',
        'complementaryFeedingAgeAppropriateQuantity',
        'complementaryFeedingDietaryDiversity',
        'complementaryFeedingDuringAfterIllness',
        'complementaryFeedingResponsiveFeeding',
        'stimulationActivitiesPlayTherapy',
        'useTakeHomeRationPreparationTips',
        'feedingDemonstrationTHR',
        'regularGrowthMonitoringImportance',
        'nutritionStatusOfChildren',
        'whatIsUndernutritionSevereSAM',
        'consequencesUndernutritionForChild',
        'gettingReadyPreschoolAWC',
        'healthyDietChildrenGeneral',
        'importanceHandWashSanitation',
        'ifaSupplementationChildren',
        'vitaminASupplementationChildren',
        'dewormingForChildren',
        'careDuringPregnancyPreparedness',
        'nutritionCarePregnancyLactation',
        'ifaSupplementationPregnancyLactation',
        'calciumSupplementationPregnancyLactation',
        'anemiaPreventionAdolescentsIFA',
        'lowBirthWeightChildrenFollowUp',
        'vaccinationOfChild',
        'vaccinationOfMother',
        'careOfSickChildDiarrheaFever',
        'others'
    ];

    const counsellingAids = [
        'mcpCard',
        'poshanTrackerAppResources',
        'individualGrowthChart',
        'communityGrowthChart',
        'ilaModuleTakeAway',
        'cmamBookResources',
        'otherTechEnabledResource',
        'nothing',
        'others'
    ];

    return (
        <div id="cbeForm" name="cbeForm">
            <StyledDetails open>
                <summary>&nbsp;{t('section5CommunityBasedEventsObservation')}</summary>
                <Grid container rowSpacing={3} columnSpacing={2} sx={{
                    margin: '0',
                    width: '100%'
                }}>
                    {/* Question 5.1 */}
                    <Grid item xs={12}>
                        <label className={styles.label} htmlFor="themeOfCbe">
                            {t('section51CBETheme')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <RadioGroup
                            aria-label="themeOfCbe"
                            name="themeOfCbe"
                            value={themeOfCbe}
                            onChange={(e) => setThemeOfCbe(e.target.value)}
                        >
                            <FormControlLabel value="Annaprashan" control={<Radio />} label={t('annaprashan')} />
                            <FormControlLabel value="Suposahn Diwas" control={<Radio />} label={t('suposhahnDiwas')} />
                            <FormControlLabel value="Others" control={<Radio />} label={t('others')} />
                        </RadioGroup>
                        {renderProblem('themeOfCbe')}
                    </Grid>

                    {/* Conditional "Others" field for 5.1 */}
                    {themeOfCbe === 'Others' && (
                        <Grid item xs={12}>
                            <label className={styles.label} htmlFor="themeOfCbeOther">
                                {t('otherSpecify')} <span className={styles.requiredStar}>*</span>
                            </label>
                            <TextField
                                size="small"
                                className={styles.formInput}
                                name="themeOfCbeOther"
                                id="themeOfCbeOther"
                                value={themeOfCbeOther}
                                onChange={(e) => setThemeOfCbeOther(e.target.value)}
                                placeholder={t('pleaseSpecifyOtherTheme')}
                                error={!!problemFor('themeOfCbeOther')}
                                helperText={`${textLength(themeOfCbeOther.trim())}/${CBE_THEME_OTHER_MAX}`}
                            />
                            {renderProblem('themeOfCbeOther')}
                        </Grid>
                    )}

                    {/* Question 5.2 */}
                    <Grid item xs={12}>
                        <label className={styles.label}>
                            {t('section52BeneficiaryType')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <Typography variant="body2" sx={{ fontStyle: 'italic', mb: 1 }}>
                            {t('multipleResponse')}
                        </Typography>
                        <FormGroup>
                            {beneficiaryTypes.map((beneficiaryKey) => (
                                <FormControlLabel
                                    key={beneficiaryKey}
                                    control={
                                        <Checkbox
                                            name="typeOfBeneficiaryAttendedCbe"
                                            value={beneficiaryKey}
                                            checked={typeOfBeneficiaryAttendedCbe.includes(beneficiaryKey)}
                                            onChange={(e) => {
                                                const { checked, value } = e.target;
                                                if (checked) {
                                                    setTypeOfBeneficiaryAttendedCbe([...typeOfBeneficiaryAttendedCbe, value]);
                                                } else {
                                                    setTypeOfBeneficiaryAttendedCbe(typeOfBeneficiaryAttendedCbe.filter(item => item !== value));
                                                }
                                            }}
                                        />
                                    }
                                    label={t(beneficiaryKey)}
                                />
                            ))}
                        </FormGroup>
                        {renderProblem('typeOfBeneficiaryAttendedCbe')}
                    </Grid>

                    {/* Conditional "Others" field for 5.2 */}
                    {typeOfBeneficiaryAttendedCbe.includes('others') && (
                        <Grid item xs={12}>
                            <label className={styles.label} htmlFor="typeOfBeneficiaryAttendedCbeOther">
                                {t('otherSpecify')} <span className={styles.requiredStar}>*</span>
                            </label>
                            <TextField
                                size="small"
                                className={styles.formInput}
                                name="typeOfBeneficiaryAttendedCbeOther"
                                id="typeOfBeneficiaryAttendedCbeOther"
                                value={typeOfBeneficiaryAttendedCbeOther}
                                onChange={(e) => setTypeOfBeneficiaryAttendedCbeOther(e.target.value)}
                                placeholder={t('pleaseSpecifyOtherBeneficiaryTypes')}
                                error={!!problemFor('typeOfBeneficiaryAttendedCbeOther')}
                            />
                            {renderProblem('typeOfBeneficiaryAttendedCbeOther')}
                        </Grid>
                    )}

                    {/* Question 5.3 */}
                    <Grid item xs={12}>
                        <label className={styles.label}>
                            {t('section53ServiceProviders')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <Typography variant="body2" sx={{ fontStyle: 'italic', mb: 1 }}>
                            {t('multipleResponse')}
                        </Typography>
                        <FormGroup>
                            {serviceProviders.map((providerKey) => (
                                <FormControlLabel
                                    key={providerKey}
                                    control={
                                        <Checkbox
                                            name="serviceProvidersPresentCbe"
                                            value={providerKey}
                                            checked={serviceProvidersPresentCbe.includes(providerKey)}
                                            onChange={(e) => {
                                                const { checked, value } = e.target;
                                                if (checked) {
                                                    setServiceProvidersPresentCbe([...serviceProvidersPresentCbe, value]);
                                                } else {
                                                    setServiceProvidersPresentCbe(serviceProvidersPresentCbe.filter(item => item !== value));
                                                }
                                            }}
                                        />
                                    }
                                    label={t(providerKey)}
                                />
                            ))}
                        </FormGroup>
                        {renderProblem('serviceProvidersPresentCbe')}
                    </Grid>

                    {/* Conditional "Others" field for 5.3 */}
                    {serviceProvidersPresentCbe.includes('others') && (
                        <Grid item xs={12}>
                            <label className={styles.label} htmlFor="serviceProvidersPresentCbeOther">
                                {t('otherSpecify')} <span className={styles.requiredStar}>*</span>
                            </label>
                            <TextField
                                size="small"
                                className={styles.formInput}
                                name="serviceProvidersPresentCbeOther"
                                id="serviceProvidersPresentCbeOther"
                                value={serviceProvidersPresentCbeOther}
                                onChange={(e) => setServiceProvidersPresentCbeOther(e.target.value)}
                                placeholder={t('pleaseSpecifyOtherServiceProviders')}
                                inputProps={{ maxLength: 20 }}
                                error={!!problemFor('serviceProvidersPresentCbeOther')}
                            />
                            {renderProblem('serviceProvidersPresentCbeOther')}
                        </Grid>
                    )}

                    {/* Question 5.4 */}
                    <Grid item xs={12}>
                        <label className={styles.label} htmlFor="groupCounsellingConducted">
                            {t('section54GroupCounselling')} <span className={styles.requiredStar}>*</span>
                        </label>
                        <RadioGroup
                            aria-label="groupCounsellingConducted"
                            name="groupCounsellingConducted"
                            value={groupCounsellingConducted}
                            onChange={(e) => setGroupCounsellingConducted(e.target.value)}
                        >
                            <FormControlLabel value="Yes" control={<Radio />} label={t('yes')} />
                            <FormControlLabel value="No" control={<Radio />} label={t('no')} />
                        </RadioGroup>
                        {renderProblem('groupCounsellingConducted')}
                    </Grid>

                    {/* Questions 5.5 and 5.6 only if 5.4 is Yes */}
                    {groupCounsellingConducted === 'Yes' && (
                        <>
                            {/* Question 5.5 */}
                            <Grid item xs={12}>
                                <label className={styles.label}>
                                    {t('section55CounsellingTopics')} <span className={styles.requiredStar}>*</span>
                                </label>
                                <Typography variant="body2" sx={{ fontStyle: 'italic', mb: 1 }}>
                                    {t('multipleResponse')}
                                </Typography>
                                <FormGroup>
                                    {counsellingTopics.map((topicKey) => (
                                        <FormControlLabel
                                            key={topicKey}
                                            control={
                                                <Checkbox
                                                    name="counsellingTopicsCbe"
                                                    value={topicKey}
                                                    checked={counsellingTopicsCbe.includes(topicKey)}
                                                    onChange={(e) => {
                                                        const { checked, value } = e.target;
                                                        if (checked) {
                                                            setCounsellingTopicsCbe([...counsellingTopicsCbe, value]);
                                                        } else {
                                                            setCounsellingTopicsCbe(counsellingTopicsCbe.filter(item => item !== value));
                                                        }
                                                    }}
                                                />
                                            }
                                            label={t(topicKey)}
                                        />
                                    ))}
                                </FormGroup>
                        {renderProblem('counsellingTopicsCbe')}
                            </Grid>

                            {/* Conditional "Others" field for 5.5 */}
                            {counsellingTopicsCbe.includes('others') && (
                                <Grid item xs={12}>
                                    <label className={styles.label} htmlFor="counsellingTopicsCbeOther">
                                        {t('otherSpecify')} <span className={styles.requiredStar}>*</span>
                                    </label>
                                    <TextField
                                        size="small"
                                        className={styles.formInput}
                                        name="counsellingTopicsCbeOther"
                                        id="counsellingTopicsCbeOther"
                                        value={counsellingTopicsCbeOther}
                                        onChange={(e) => setCounsellingTopicsCbeOther(e.target.value)}
                                        placeholder={t('pleaseSpecifyOtherTopics')}
                                        error={!!problemFor('counsellingTopicsCbeOther')}
                                    />
                                    {renderProblem('counsellingTopicsCbeOther')}
                                </Grid>
                            )}

                            {/* Question 5.6 */}
                            <Grid item xs={12}>
                                <label className={styles.label}>
                                    {t('section56CounsellingAids')} <span className={styles.requiredStar}>*</span>
                                </label>
                                <Typography variant="body2" sx={{ fontStyle: 'italic', mb: 1 }}>
                                    {t('multipleResponse')}
                                </Typography>
                                <FormGroup>
                                    {counsellingAids.map((aidKey) => (
                                        <FormControlLabel
                                            key={aidKey}
                                            control={
                                                <Checkbox
                                                    name="counsellingAidsUsed"
                                                    value={aidKey}
                                                    checked={counsellingAidsUsed.includes(aidKey)}
                                                    onChange={(e) => {
                                                        const { checked, value } = e.target;
                                                        if (value === 'nothing') {
                                                            if (checked) {
                                                                setCounsellingAidsUsed(['nothing']);
                                                            } else {
                                                                setCounsellingAidsUsed([]);
                                                            }
                                                        } else {
                                                            let updated = counsellingAidsUsed ? [...counsellingAidsUsed] : [];
                                                            if (checked) {
                                                                updated = updated.filter((v) => v !== 'nothing');
                                                                updated.push(value);
                                                            } else {
                                                                updated = updated.filter((v) => v !== value);
                                                            }
                                                            setCounsellingAidsUsed(updated);
                                                        }
                                                    }}
                                                />
                                            }
                                            label={t(aidKey)}
                                        />
                                    ))}
                                </FormGroup>
                        {renderProblem('counsellingAidsUsed')}
                            </Grid>

                            {/* Conditional "Others" field for 5.6 */}
                            {counsellingAidsUsed.includes('others') && (
                                <Grid item xs={12}>
                                    <label className={styles.label} htmlFor="counsellingAidsUsedOther">
                                        {t('otherSpecify')} <span className={styles.requiredStar}>*</span>
                                    </label>
                                    <TextField
                                        size="small"
                                        className={styles.formInput}
                                        name="counsellingAidsUsedOther"
                                        id="counsellingAidsUsedOther"
                                        value={counsellingAidsUsedOther}
                                        onChange={(e) => setCounsellingAidsUsedOther(e.target.value)}
                                        placeholder={t('otherSpecify')}
                                        error={!!problemFor('counsellingAidsUsedOther')}
                                    />
                                    {renderProblem('counsellingAidsUsedOther')}
                                </Grid>
                            )}
                        </>
                    )}

                    {/* Question 5.7 */}
                    <Grid item xs={12}>
                        <label className={styles.label} htmlFor="otherImportantObservation">
                            {t('section57OtherObservation')}
                        </label>
                        <textarea
                            className={styles.formInput}
                            name="otherImportantObservation"
                            id="otherImportantObservation"
                            value={otherImportantObservation}
                            onChange={(e) => setOtherImportantObservation(e.target.value)}
                            placeholder={t('pleaseProvideOtherImportantObservations')}
                            rows={3}
                            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: `1px solid ${observationLengthError ? '#d32f2f' : '#ccc'}` }}
                        />
                        <Typography variant="caption" sx={{ color: '#6b7280', display: 'block' }}>
                            {`${textLength(otherImportantObservation)}/${LONG_NOTE_MAX}`}
                        </Typography>
                        {renderProblem('otherImportantObservation')}
                    </Grid>



                    {/* Hidden inputs to combine selected options with "Others" text for form submission */}
                    <input
                        type="hidden"
                        name="themeOfCbe"
                        value={themeOfCbe === 'Others' && themeOfCbeOther.trim() ? `Others - ${themeOfCbeOther.trim()}` : themeOfCbe}
                    />

                    <input
                        type="hidden"
                        name="typeOfBeneficiaryAttendedCbe"
                        value={(() => {
                            let finalOptions = [...typeOfBeneficiaryAttendedCbe];
                            if (typeOfBeneficiaryAttendedCbe.includes('others') && typeOfBeneficiaryAttendedCbeOther.trim()) {
                                finalOptions = finalOptions.filter(option => option !== 'others');
                                finalOptions.push(`Others - ${typeOfBeneficiaryAttendedCbeOther.trim()}`);
                            }
                            return finalOptions.join(', ');
                        })()}
                    />

                    <input
                        type="hidden"
                        name="serviceProvidersPresentCbe"
                        value={(() => {
                            let finalOptions = [...serviceProvidersPresentCbe];
                            if (serviceProvidersPresentCbe.includes('others') && serviceProvidersPresentCbeOther.trim()) {
                                finalOptions = finalOptions.filter(option => option !== 'others');
                                finalOptions.push(`Others - ${serviceProvidersPresentCbeOther.trim()}`);
                            }
                            return finalOptions.join(', ');
                        })()}
                    />

                    <input
                        type="hidden"
                        name="groupCounsellingConducted"
                        value={groupCounsellingConducted}
                    />

                    {groupCounsellingConducted === 'Yes' && (
                        <input
                            type="hidden"
                            name="counsellingTopicsCbe"
                            value={(() => {
                                let finalOptions = [...counsellingTopicsCbe];
                                if (counsellingTopicsCbe.includes('others') && counsellingTopicsCbeOther.trim()) {
                                    finalOptions = finalOptions.filter(option => option !== 'others');
                                    finalOptions.push(`Others - ${counsellingTopicsCbeOther.trim()}`);
                                }
                                return finalOptions.join(', ');
                            })()}
                        />
                    )}

                    {groupCounsellingConducted === 'Yes' && (
                        <input
                            type="hidden"
                            name="counsellingAidsUsed"
                            value={(() => {
                                let finalOptions = [...counsellingAidsUsed];
                                if (counsellingAidsUsed.includes('others') && counsellingAidsUsedOther.trim()) {
                                    finalOptions = finalOptions.filter(option => option !== 'others');
                                    finalOptions.push(`Others - ${counsellingAidsUsedOther.trim()}`);
                                }
                                return finalOptions.join(', ');
                            })()}
                        />
                    )}


                </Grid>
            </StyledDetails>
        </div>
    );
});

export default CommunityBasedEventsObservationSection;
