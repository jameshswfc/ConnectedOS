import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ResourceNotFoundCard() {
  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>Resource not found or no longer active.</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-slate-600">
          The resource you tried to open is no longer available on this record page.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href="/field-services/resources"><Button>Back to Resources</Button></Link>
          <Link href="/field-services/schedule"><Button variant="secondary">Field Services Schedule</Button></Link>
        </div>
      </CardContent>
    </Card>
  );
}
