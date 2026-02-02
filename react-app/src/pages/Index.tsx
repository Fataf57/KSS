import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Building2, MapPin, Phone, ShoppingBag, User } from "lucide-react";
// Le logo officiel de l'entreprise (fichier présent dans `react-app/public`)
const logoPath = "/ksslogo.jpeg";

const offices = [
  { name: "Bureau DJARADOUGOU" },
  { name: "Bureau OUINZZERVILLE" },
  { name: "Bureau MALI" },
];

const Index = () => {
  return (
    <DashboardLayout>
      {/* Bandeau principal : identité de l'entreprise + Contacts */}
      <section className="grid grid-cols-1 lg:grid-cols-[auto,1fr,auto] gap-8 items-start mb-10 animate-fade-in">
        <div className="flex justify-center lg:justify-start">
          {/* Logo entreprise */}
          <div className="w-40 h-40 rounded-full bg-white shadow-lg flex items-center justify-center overflow-hidden border border-border">
            {/* Remplacez `logoPath` par le bon chemin si nécessaire */}
            <img
              src={logoPath}
              alt="Logo ETABLISSEMENT KADER SAWADOGO ET FRERE"
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex flex-col leading-tight">
            <span className="text-xl sm:text-2xl font-extrabold tracking-tight text-card-foreground uppercase">
              ETABLISSEMENT
            </span>
            <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-card-foreground">
              KADER SAWADOGO ET FRERE
            </span>
          </div>
          <p className="inline-flex items-center gap-2 text-sm sm:text-base text-muted-foreground">
            <ShoppingBag className="w-4 h-4 text-accent" />
            <span>Achats et vente des denrées alimentaires</span>
          </p>
        </div>

        {/* Section contacts en haut à droite */}
        <div className="bg-card rounded-xl border border-border p-6 space-y-4 animate-fade-in min-w-[200px]">
          <h2 className="text-base font-semibold text-card-foreground flex items-center gap-2">
            <Phone className="w-5 h-5 text-accent" />
            <span>Contacts</span>
          </h2>
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Téléphones
            </p>
            <div className="flex flex-col text-sm text-card-foreground space-y-1">
              <span>TEL: 75 58 57 76</span>
              <span>TEL: 78 92 63 41</span>
            </div>
          </div>
        </div>
      </section>

      {/* Section PDG + Bureaux */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        {/* Carte PDG */}
        <div className="lg:col-span-1 bg-card rounded-xl border border-border p-6 space-y-4 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
              <User className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                PDG
              </p>
              <p className="text-lg font-semibold text-card-foreground">
                KADER SAWADOGO
              </p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Direction générale des ETABLISSEMENT KADER SAWADOGO ET FRERE.
          </p>
        </div>

        {/* Carte bureaux */}
        <div className="lg:col-span-2 bg-card rounded-xl border border-border p-6 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-accent" />
              <h2 className="text-base sm:text-lg font-semibold text-card-foreground">
                Bureaux ETABLISSEMENT KADER SAWADOGO ET FRERE
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
            {offices.map((office) => (
              <div
                key={office.name}
                className="rounded-lg border border-border/70 bg-muted/40 px-4 py-3 flex items-center gap-2"
              >
                <MapPin className="w-4 h-4 text-accent flex-shrink-0" />
                <p className="text-sm font-medium text-card-foreground">
                  {office.name}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section Contacts Mali */}
      <section className="mb-10">
        <div className="bg-card rounded-xl border border-border p-6 space-y-4 animate-fade-in">
          <h2 className="text-base font-semibold text-card-foreground flex items-center gap-2">
            <Phone className="w-5 h-5 text-accent" />
            <span>Contacts Mali</span>
          </h2>
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Téléphones
            </p>
            <div className="flex flex-col text-sm text-card-foreground space-y-1">
              <span>TEL: +223 73 73 73 44</span>
              <span>TEL: +223 74 52 11 47</span>
            </div>
          </div>
        </div>
      </section>

      {/* Section denrées */}
      <section className="bg-card rounded-xl border border-border p-6 animate-fade-in mb-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex flex-col items-center space-y-3">
            <div className="w-full h-48 rounded-lg overflow-hidden border border-border bg-muted/40 flex items-center justify-center">
              <img
                src="/Mais.jpg"
                alt="Maïs"
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) {
                    parent.innerHTML = '<div class="flex items-center justify-center w-full h-full text-muted-foreground">Maïs</div>';
                  }
                }}
              />
            </div>
            <p className="text-sm font-semibold text-card-foreground">Maïs</p>
          </div>

          <div className="flex flex-col items-center space-y-3">
            <div className="w-full h-48 rounded-lg overflow-hidden border border-border bg-muted/40 flex items-center justify-center">
              <img
                src="/Anacarde.jpg"
                alt="Anacarde"
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) {
                    parent.innerHTML = '<div class="flex items-center justify-center w-full h-full text-muted-foreground">Anacarde</div>';
                  }
                }}
              />
            </div>
            <p className="text-sm font-semibold text-card-foreground">Anacarde</p>
          </div>

          <div className="flex flex-col items-center space-y-3">
            <div className="w-full h-48 rounded-lg overflow-hidden border border-border bg-muted/40 flex items-center justify-center">
              <img
                src="/karité.jpeg"
                alt="Karité"
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) {
                    parent.innerHTML = '<div class="flex items-center justify-center w-full h-full text-muted-foreground">Karité</div>';
                  }
                }}
              />
            </div>
            <p className="text-sm font-semibold text-card-foreground">Karité</p>
          </div>
        </div>
      </section>
    </DashboardLayout>
  );
};

export default Index;
