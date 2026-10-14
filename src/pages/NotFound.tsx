import { Link, isRouteErrorResponse, useRouteError } from 'react-router-dom'
import { DeodarIcon, HandUnderline, Logo, Topo } from '../components/Marks'
import { Button } from '../components/ui'

function Trail({ title, line, code }: { title: string; line: string; code?: string }) {
  return (
    <div className="relative overflow-hidden border border-pine/10 bg-white/70 px-6 py-12 shadow-lift sm:px-12 sm:py-16" style={{ borderRadius: '38px 14px 42px 16px' }}>
      <Topo opacity={0.2} />
      <div className="relative grid items-center gap-8 md:grid-cols-[auto_1fr]">
        <div className="relative mx-auto flex items-end gap-1 text-teal md:mx-0" aria-hidden="true">
          <DeodarIcon size={44} className="-rotate-6 text-forest/70" />
          <DeodarIcon size={84} />
          <DeodarIcon size={56} className="rotate-3 text-forest/80" />
          <span className="absolute -right-5 -top-3 h-7 w-7 rounded-full bg-saffron" />
        </div>
        <div className="text-center md:text-left">
          {code && <p className="font-num text-[clamp(4.5rem,16vw,9rem)] font-black leading-[0.85] tracking-[-0.05em] text-pine">{code}</p>}
          <h1 className="mt-3 text-3xl font-black leading-tight tracking-[-0.03em] sm:text-4xl">{title}</h1>
          <HandUnderline className="mx-auto mt-2 h-3 w-36 md:mx-0" />
          <p className="mx-auto mt-4 max-w-md text-[16px] leading-relaxed text-pine/80 md:mx-0">{line}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3 md:justify-start">
            <Link to="/">
              <Button variant="primary">Back to Home</Button>
            </Link>
            <Link to="/roster">
              <Button variant="ghost">Open the roster</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Inside the app shell: the rail stays, only the page is missing. */
export default function NotFound() {
  return <Trail code="404" title="This trail doesn't lead anywhere." line="The page you were after has moved on, or never existed. Everything in this sample hotel is reachable from the rail." />
}

/** A route threw: shown without the shell, in the same hand-made style. */
export function ErrorPage() {
  const err = useRouteError()
  const notFound = isRouteErrorResponse(err) && err.status === 404
  return (
    <div className="grain relative min-h-screen bg-paper px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <Link to="/" className="mb-6 inline-flex items-center gap-2" aria-label="RosterIQ home">
          <Logo size={40} />
          <span className="font-display text-xl font-black">
            Roster<span className="text-saffron">IQ</span>
          </span>
        </Link>
        <Trail
          code={notFound ? '404' : undefined}
          title={notFound ? "This trail doesn't lead anywhere." : 'Something slipped on the hill path.'}
          line={notFound ? 'That page is not part of this sample.' : 'The screen hit an unexpected problem. Going back home and pressing Reset demo puts everything back the way it started.'}
        />
      </div>
    </div>
  )
}
