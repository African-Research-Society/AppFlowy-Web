
import Typography from '@mui/material/Typography';
import React from 'react';
import { useSearchParams } from 'react-router-dom';

import { getSafeRedirectUrl } from '@/application/session/sign_in';
import { ReactComponent as AppflowyLogo } from '@/assets/icons/appflowy.svg';
import Import from '@/components/_shared/more-actions/importer/Import';

function ImportPage() {
  const [search] = useSearchParams();
  const redirectTo = search.get('redirectToImport');
  const safeRedirectTo = redirectTo ? getSafeRedirectUrl(redirectTo) : null;
  const onSuccess = React.useCallback(() => {
    if (safeRedirectTo) {
      window.location.href = safeRedirectTo;
    }
  }, [safeRedirectTo]);

  return (
    <div className={'flex h-screen w-screen flex-col bg-[#EEEEFD]'}>
      <div className={'h-[64px] w-full px-6 py-4'}>
        <Typography variant='h3' className={'mb-[27px] flex items-center gap-4 text-text-primary'} gutterBottom>
          <>
            <AppflowyLogo className={'w-32'} />
          </>
        </Typography>
      </div>
      <Import onSuccessfulImport={onSuccess} disableClose={true} />
    </div>
  );
}

export default ImportPage;
