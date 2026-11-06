import { ArrowLeft, Compass, Radio } from "lucide-react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"

export function NotFoundPage() {
  return (
    <main className="flex min-h-[70vh] items-center justify-center px-6 py-16">
      <div className="max-w-md text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Radio className="size-6" /></span>
        <p className="mt-6 text-xs font-medium tracking-[0.3em] text-muted-foreground uppercase">Signal not found</p>
        <h1 className="mt-2 text-8xl font-semibold tracking-tighter">404</h1>
        <h2 className="mt-4 text-xl font-semibold">This page is off air.</h2>
        <p className="mt-2 text-sm text-muted-foreground">The link may have moved. Your next channel is still here.</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Button asChild><Link to="/"><ArrowLeft /> Back home</Link></Button>
          <Button asChild variant="outline"><Link to="/browse"><Compass /> Browse channels</Link></Button>
        </div>
      </div>
    </main>
  )
}
