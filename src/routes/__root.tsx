import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { InquiryProvider } from "@/context/InquiryContext";
import logoIcon from "@/assets/logo-icon.png.asset.json";


function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Gatepath Realtors — Your Interest is Our Priority" },
      { name: "description", content: "Gatepath Realtors — Kenya's trusted land marketplace. Verified plots in Malindi, Sagana, Diani, Thika, Nanyuki and beyond. Your Interest is Our Priority." },
      { name: "author", content: "Gatepath Realtors" },
      { property: "og:title", content: "Gatepath Realtors — Your Interest is Our Priority" },
      { property: "og:description", content: "Kenya's trusted land marketplace. Verified plots, transparent pricing, flexible payment plans." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@GatepathRealtors" },
      { name: "twitter:title", content: "Gatepath Realtors — Your Interest is Our Priority" },
      { name: "twitter:description", content: "Kenya's trusted land marketplace. Verified plots, transparent pricing, flexible payment plans." },

      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/f65cc7c1-9682-48f1-b644-1287deb79a53/id-preview-358fba6a--50066243-621a-4e2e-a38a-a86a151bbde0.lovable.app-1779732432810.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/f65cc7c1-9682-48f1-b644-1287deb79a53/id-preview-358fba6a--50066243-621a-4e2e-a38a-a86a151bbde0.lovable.app-1779732432810.png" },
    ],
    links: [
      { rel: "icon", type: "image/png", href: logoIcon.url },
      { rel: "apple-touch-icon", href: logoIcon.url },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400;1,500;1,600&family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500;600&family=Montserrat:wght@500;600;700&display=swap",
      },
      { rel: "stylesheet", href: appCss },
    ],

  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <InquiryProvider>
        <Outlet />
      </InquiryProvider>
    </QueryClientProvider>
  );
}
