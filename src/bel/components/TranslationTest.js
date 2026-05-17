import React from 'react';
import { useTranslation } from 'react-i18next';

const TranslationTest = () => {
  // Use the BEL i18n instance
  const { t, i18n, ready } = useTranslation();


  return (
    <div style={{ padding: '20px', border: '1px solid red', margin: '10px' }}>
      <h3>Translation Test Component</h3>
      <p>Ready: {ready ? 'Yes' : 'No'}</p>
      <p>Current Language: {i18n.language}</p>
      <p>Available Languages: {i18n.languages.join(', ')}</p>
      <p>Survey Title: {t('survey.title')}</p>
      <p>Survey Subtitle: {t('survey.subtitle')}</p>
      <p>Section Role: {t('survey.sections.role')}</p>
      <p>Question 1a: {t('survey.questions.1a')}</p>
      <p>Option Strongly Disagree: {t('survey.options.strongly_disagree')}</p>
    </div>
  );
};

export default TranslationTest; 