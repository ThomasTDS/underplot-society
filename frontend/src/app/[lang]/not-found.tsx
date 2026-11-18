import { NotFoundMessage } from "@/components/NotFoundMessage";

/** For notFound() inside a localized page: the site layout stays, the message follows the URL's language. */
export default function NotFound() {
  return <NotFoundMessage />;
}
