import Hero from "./components/Hero";
import Features from "./components/Features";
import Pricing from "./components/Pricing";
import Contact from "./components/Contact";
import Footer from "./components/Footer";

export default function Home() {
  return (
    <main>
      <Hero />
      <Features />
      <Pricing />
      <Contact />
      <Footer />
    </main>
  );
}
