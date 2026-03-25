import owlLogoSrc from "@assets/owl-logo.png";

export function GuanXingLogo({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <div className={`${className} rounded-lg overflow-hidden bg-white dark:bg-white flex-shrink-0 flex items-center justify-center`}>
      <img src={owlLogoSrc} alt="观星" className="w-full h-full scale-125 object-contain" />
    </div>
  );
}
