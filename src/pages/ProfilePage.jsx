import React from 'react';
import ProfileDetails from '../components/browse/ProfileDetails';
import { useTranslation } from 'react-i18next';

const ProfilePage = () => {
  const { t } = useTranslation();
  return (
    <div className="bg-gray-50 dark:bg-gray-950 min-h-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('PROFILE.TITLE')}</h1>
          <p className="text-gray-500 dark:text-gray-400">{t('PROFILE.DESCRIPTION')}</p>
        </div>
      </div>

      <ProfileDetails />
    </div>
  );
};

export default ProfilePage; 