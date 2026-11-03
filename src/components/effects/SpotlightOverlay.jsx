export function SpotlightOverlay({ className = "h-64 w-64", intensity = "0.5" }) {
    return (
        <div
            className={`pointer-events-none absolute top-0 left-0 ${className} bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,${intensity})_20%,transparent_70%)]`}
            aria-hidden="true"
        />
    );
}