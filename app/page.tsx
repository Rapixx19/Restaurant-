import { Navigation, Hero, Features, Pricing, Footer } from '@/modules/landing';

export default function HomePage() {
  return (
    <>
      <Navigation />
      <main>
        <Hero />
        <Features />
        <Pricing />
      </main>
      <Footer />
    </>
  );
}
