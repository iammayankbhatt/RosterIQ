import { Link } from 'react-router-dom'
import { DeodarIcon, Topo } from '../components/Marks'
import { Button, Card, SectionTitle, Tag } from '../components/ui'

export default function Placeholder({ title, line }: { title: string; line: string }) {
  return (
    <div className="relative">
      <SectionTitle eyebrow="Coming up next">{title}</SectionTitle>
      <Card tilt={-0.8} className="relative max-w-xl overflow-hidden">
        <Topo opacity={0.12} />
        <div className="relative space-y-4">
          <Tag tone="saffron" tilt={2}>Still being built</Tag>
          <p className="text-[15px] leading-relaxed text-pine">{line}</p>
          <DeodarIcon size={30} className="text-teal" />
          <Link to="/">
            <Button variant="ghost">Back to Home</Button>
          </Link>
        </div>
      </Card>
    </div>
  )
}
