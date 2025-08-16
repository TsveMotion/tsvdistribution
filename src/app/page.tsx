import HomePage from "@/components/HomePage";
import Script from "next/script";

export default function Home() {
  return (
    <>
      <Script id="ld-json-org" type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "TsvStock",
            url: "https://tsvstock.com/",
            logo: "https://tsvstock.com/og-image.png",
            sameAs: [],
          }),
        }}
      />
      <HomePage />
    </>
  );
}

