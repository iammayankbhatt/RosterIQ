import { Link } from 'react-router-dom'
import { DeodarIcon, StatusDot, Topo } from '../components/Marks'
import { Button, Card, Highlight, SectionTitle, Stat, Tag } from '../components/ui'
import { formatLakh } from '../lib/format'
import { lastSeasonTotal } from '../data'

const swatches = [
  ['pine', '#12302B'],
  ['forest', '#1F5A4C'],
  ['teal', '#2E7D6B'],
  ['saffron', '#F2A33A'],
  ['mist', '#EEF4F1'],
  ['paper', '#FBF8F1'],
  ['terracotta', '#C8553D'],
  ['stone', '#6F817B'],
] as const

export default function DesignKit() {
  return (
    <div className="space-y-16">
      <section className="relative overflow-hidden rounded-[34px_14px_38px_16px] bg-pine px-6 py-12 text-paper shadow-lift sm:px-12 sm:py-16">
        <Topo stroke="var(--teal)" opacity={0.5} />
        <DeodarIcon size={54} className="absolute -bottom-1 right-6 text-forest sm:right-14" />
        <DeodarIcon size={34} className="absolute bottom-0 right-24 text-forest/70 sm:right-36" />
        <Tag tone="saffron" tilt={-2}>Sample build · AI-Tourism Hackathon 2026</Tag>
        <h1 className="mt-5 max-w-2xl font-display text-4xl font-semibold leading-[1.08] text-paper sm:text-6xl">
          Fair rosters for hotels that <Highlight className="text-pine">live by the season</Highlight>.
        </h1>
        <p className="mt-5 max-w-xl text-lg text-mist/85">
          RosterIQ turns occupancy forecasts into rosters people can live with, warns you before someone burns out, and shows
          what that is worth in rupees.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/seed"><Button variant="saffron">Look at the seed data</Button></Link>
          <Button variant="ghost" className="!text-paper !ring-paper/30 hover:!bg-paper/10">Design kit below</Button>
        </div>
      </section>

      <section>
        <SectionTitle eyebrow="Stats">Big numbers, always Fraunces</SectionTitle>
        <div className="grid gap-5 md:grid-cols-3">
          <Stat label="Last season's replacement cost" value={lastSeasonTotal} format={formatLakh} basis="assumption" highlight tilt={-1} note="8 resignations at about ₹30,000 each." />
          <Stat label="Staff in the sample hotel" value={20} basis="sample" tone="mist" note="Across 6 departments." />
          <Stat label="Rooms, Deodar Heights" value={25} basis="sample" tone="pine" tilt={1.2} note="Mussoorie, fictional property." />
        </div>
      </section>

      <section className="grid gap-8 md:grid-cols-2">
        <div>
          <SectionTitle eyebrow="Palette">Eight colours, one hillside</SectionTitle>
          <div className="grid grid-cols-4 gap-3">
            {swatches.map(([n, hex], i) => (
              <div key={n} className="text-xs">
                <div
                  className={`h-16 border border-pine/15 shadow-warm ${i % 2 ? 'rounded-card-alt' : 'rounded-card'}`}
                  style={{ background: `var(--${n})` }}
                />
                <p className="mt-1.5 font-semibold">{n}</p>
                <p className="text-stone">{hex}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-5">
          <SectionTitle eyebrow="Parts">Tags, dots and buttons</SectionTitle>
          <Card alt tilt={-0.8} className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Tag tone="teal">Healthy</Tag>
              <Tag tone="saffron">Watch</Tag>
              <Tag tone="terracotta">At risk</Tag>
              <Tag tone="stone">Sample</Tag>
              <Tag tone="pine">Peak day</Tag>
            </div>
            <div className="flex flex-wrap items-center gap-5 text-sm">
              <span className="inline-flex items-center gap-2"><StatusDot tone="ok" size={18} /> Rested</span>
              <span className="inline-flex items-center gap-2"><StatusDot tone="watch" size={18} /> Watch</span>
              <span className="inline-flex items-center gap-2"><StatusDot tone="risk" size={18} /> Risk</span>
              <span className="inline-flex items-center gap-2"><StatusDot tone="idle" size={18} /> No data</span>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button>Build roster</Button>
              <Button variant="saffron">Apply suggestion</Button>
              <Button variant="ghost">Not now</Button>
            </div>
          </Card>
        </div>
      </section>
    </div>
  )
}
