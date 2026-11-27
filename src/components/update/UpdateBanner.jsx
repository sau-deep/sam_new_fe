// Tells the user when a newer build is available or this one is no longer
// supported, and offers the update. Never blocks work, never clears data.
import { useState } from 'react';
import { Alert, Button, Modal } from 'antd';
import { useTranslation } from 'react-i18next';
import { useUpdateStatus } from '../../context/UpdateContext';
import { UPDATE_LEVEL } from '../../utils/releaseVerdict';
import { activateUpdateAndReload } from '../../serviceWorkerRegistration';

// Fixed, validated destination (plan §7 "openStore"): only this app's Play listing.
const PLAY_URL = 'https://play.google.com/store/apps/details?id=com.diva.sam';
const PLAY_URL_PATTERN = /^https:\/\/play\.google\.com\/store\/apps\/details\?id=com\.diva\.sam(&.*)?$/;
const DISMISS_KEY = 'samUpdateDismissed';

const TEXT = {
  en: {
    recommended: 'A new version of the app is available.',
    required: 'This version of the app is no longer supported. Please update.',
    requiredBy: d => `Please update before ${d}.`,
    updateAndroid: 'Update',
    updateWeb: 'Reload to update',
    confirmTitle: 'Reload the app now?',
    confirmBody: 'Finish or save the form you are working on first. Saved drafts and offline surveys are kept.',
    later: 'Later',
  },
  hi: {
    recommended: 'ऐप का नया संस्करण उपलब्ध है।',
    required: 'ऐप का यह संस्करण अब समर्थित नहीं है। कृपया अपडेट करें।',
    requiredBy: d => `कृपया ${d} से पहले अपडेट करें।`,
    updateAndroid: 'अपडेट करें',
    updateWeb: 'अपडेट के लिए रीलोड करें',
    confirmTitle: 'ऐप अभी रीलोड करें?',
    confirmBody: 'पहले चल रहा फ़ॉर्म पूरा या सेव करें। सेव किए ड्राफ़्ट और ऑफ़लाइन सर्वे सुरक्षित रहते हैं।',
    later: 'बाद में',
  },
};

function targetKey(policy, client) {
  return client?.platform === 'android'
    ? `android:${policy?.android?.latestVersionCode}`
    : `web:${policy?.web?.latestReleaseSequence}`;
}

function readDismissed() {
  try { return localStorage.getItem(DISMISS_KEY); } catch { return null; }
}

export default function UpdateBanner() {
  const { verdict, policy, client } = useUpdateStatus();
  const { i18n } = useTranslation();
  const [dismissed, setDismissed] = useState(readDismissed);

  if (!verdict || !policy) return null;
  const { level } = verdict;
  if (level !== UPDATE_LEVEL.RECOMMENDED && level !== UPDATE_LEVEL.REQUIRED) return null;

  const key = targetKey(policy, client);
  if (level === UPDATE_LEVEL.RECOMMENDED && dismissed === key) return null;

  const lang = String(i18n?.language || 'en').slice(0, 2) === 'hi' ? 'hi' : 'en';
  const t = TEXT[lang];
  const custom = policy.message?.[lang] || policy.message?.en;
  const deadline = verdict.requiredAfter && level === UPDATE_LEVEL.RECOMMENDED && Date.parse(verdict.requiredAfter) > Date.now()
    ? t.requiredBy(new Date(verdict.requiredAfter).toLocaleDateString())
    : null;
  const text = [custom || (level === UPDATE_LEVEL.REQUIRED ? t.required : t.recommended), deadline].filter(Boolean).join(' ');

  const update = () => {
    if (client?.platform === 'android') {
      const url = PLAY_URL_PATTERN.test(policy.android?.storeUrl || '') ? policy.android.storeUrl : PLAY_URL;
      window.open(url, '_blank', 'noopener');
      return;
    }
    Modal.confirm({
      title: t.confirmTitle,
      content: t.confirmBody,
      okText: t.updateWeb,
      cancelText: t.later,
      onOk: () => activateUpdateAndReload(),
    });
  };

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, key); } catch { /* ignore */ }
    setDismissed(key);
  };

  return (
    <Alert
      type={level === UPDATE_LEVEL.REQUIRED ? 'warning' : 'info'}
      showIcon
      banner
      message={text}
      closable={level === UPDATE_LEVEL.RECOMMENDED}
      onClose={dismiss}
      action={
        <Button size="small" type="primary" onClick={update}>
          {client?.platform === 'android' ? t.updateAndroid : t.updateWeb}
        </Button>
      }
      style={{ marginBottom: 12 }}
      data-testid="update-banner"
    />
  );
}
