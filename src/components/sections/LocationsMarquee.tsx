const locations = [
  "Malindi", "Mambrui", "Gongoni", "Diani", "Matuu", "Sagana",
  "Makutano", "Thika", "Juja", "Kithimani", "Kiambu", "Nanyuki",
];

export function LocationsMarquee() {
  const loop = [...locations, ...locations];
  return (
    <section id="locations" className="bg-background py-8 border-y border-border/60 overflow-hidden">
      <div className="text-center mb-5">
        <span className="eyebrow">Where We Operate</span>
      </div>
      <div className="marquee-pause overflow-hidden">
        <div className="animate-marquee flex gap-4 w-max">
          {loop.map((loc, i) => (
            <span
              key={`${loc}-${i}`}
              className="shrink-0 inline-flex items-center gap-2 bg-white border-[1.5px] border-accent rounded-full px-6 py-2.5 text-[15px] font-medium text-primary hover:bg-primary hover:text-white transition-colors cursor-default"
            >
              <span className="text-accent">🌿</span> {loc}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
