import Link from 'next/link'
import Image from 'next/image'

export type TeamPortraitProps = {
  name: string
  role?: string
  imageSrc?: string
  initials?: string
  href?: string
  sizes?: string
  priority?: boolean
  className?: string
}

export function teamPortraitInitials(name: string, initials?: string): string {
  if (initials?.trim()) return initials.trim().slice(0, 2).toUpperCase()
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

function PortraitPlaceholder({ name, initials }: { name: string; initials?: string }) {
  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[#02181b] via-[#05363A] to-slate-800 px-4 text-center transition duration-500 group-hover:scale-[1.02] group-hover:from-[#05363A] group-hover:to-emerald-900"
      aria-hidden
    >
      <span className="text-3xl font-semibold tracking-tight text-white/95 sm:text-4xl">
        {teamPortraitInitials(name, initials)}
      </span>
      <span className="mt-3 max-w-[10rem] text-[11px] font-medium uppercase tracking-[0.14em] text-emerald-200/80">
        Photo coming soon
      </span>
    </div>
  )
}

export function MarketingTeamPortrait({
  name,
  imageSrc,
  initials,
  href,
  sizes = '20vw',
  priority = false,
  className = '',
}: TeamPortraitProps) {
  const hasPhoto = Boolean(imageSrc)
  const inner = hasPhoto ? (
    <Image
      src={imageSrc!}
      alt={name}
      fill
      priority={priority}
      className="object-cover grayscale transition duration-500 group-hover:scale-[1.02] group-hover:grayscale-0"
      sizes={sizes}
    />
  ) : (
    <PortraitPlaceholder name={name} initials={initials} />
  )

  return (
    <div className={`relative aspect-[4/5] w-full overflow-hidden bg-slate-200 ${className}`}>
      {href ? (
        <Link href={href} className="group relative block h-full w-full">
          {inner}
        </Link>
      ) : (
        <div className="group relative h-full w-full">{inner}</div>
      )}
    </div>
  )
}
