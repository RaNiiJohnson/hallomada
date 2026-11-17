import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Home, Search } from "lucide-react";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="p-8 text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
            <Search className="h-8 w-8 text-muted-foreground" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Annonce introuvable</h1>
            <p className="text-muted-foreground">
              Cette annonce immobilière n&apos;existe pas ou a été supprimée.
            </p>
          </div>

          <div className="space-y-3">
            <Link href="/listing" className="block">
              <Button className="w-full">
                <Home className="h-4 w-4 mr-2" />
                Retour aux annonces
              </Button>
            </Link>

            <Link href="/" className="block">
              <Button variant="outline" className="w-full">
                Accueil
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
