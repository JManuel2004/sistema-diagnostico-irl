import { Card, CardContent } from '@/shared/ui/card';
import type { Statement } from '@innlab/contracts';

interface Props {
  statement: Statement;
}

export function StatementCard({ statement }: Props) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-muted-foreground text-sm">Afirmación {statement.sequence} de 8</p>
        <p className="mt-1">{statement.text}</p>
      </CardContent>
    </Card>
  );
}
