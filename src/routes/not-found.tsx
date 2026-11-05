import { Compass, Home } from "lucide-react"
import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

export function NotFoundPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-20">
      <Empty className="max-w-md border py-14">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Compass />
          </EmptyMedia>
          <EmptyTitle>This page is off air</EmptyTitle>
          <EmptyDescription>
            The address you followed does not exist in Live TV Hub. The catalog is still very much
            on air, though.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <div className="flex gap-2">
            <Button asChild>
              <Link to="/">
                <Home /> Home
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/browse">
                <Compass /> Browse channels
              </Link>
            </Button>
          </div>
        </EmptyContent>
      </Empty>
    </div>
  )
}
