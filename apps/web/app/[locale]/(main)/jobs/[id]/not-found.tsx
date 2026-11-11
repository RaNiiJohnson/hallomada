import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  return (
    <div className="min-h-screen p-4 flex items-center justify-center">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <div className="mx-auto mb-4">
            <Briefcase className="h-16 w-16 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl">Offre introuvable</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Cette offre d&apos;emploi n&apos;existe pas ou a été supprimée.
          </p>
          <Link href="/jobs">
            <Button className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour aux offres
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
