import { useRouter } from 'expo-router';
import { BACKEND_URL } from '@/constants/api';
import { linkTarget } from '@/utils/siteLinks';
import { openInBrowser } from '@/utils/openLink';

/** Follows a link written by the admin (banner, page): the app's own screen when there is one, the browser otherwise. */
export function useOpenSiteLink() {
  const router = useRouter();

  return (link?: string | null) => {
    const target = linkTarget(link, BACKEND_URL);
    if (target.kind === 'app') router.push(target.route as never);
    else if (target.kind === 'web') void openInBrowser(target.url);
  };
}
