import { useState } from 'react';
import { DashboardLayout } from "@/components/layout";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Search, MoreVertical, CreditCard, RefreshCw, X, FileText } from 'lucide-react';

const mockSubscriptions = [
  { id: 1, user: 'Alice Martin', email: 'alice@example.com', plan: 'Pro', price: 24, status: 'active', billing: 'Monthly', nextBilling: '2024-07-15', mrr: 24 },
  { id: 2, user: 'Carla Santos', email: 'carla@example.com', plan: 'Pro', price: 24, status: 'active', billing: 'Monthly', nextBilling: '2024-07-08', mrr: 24 },
  { id: 3, user: 'Emma Wilson', email: 'emma@example.com', plan: 'Pro', price: 24, status: 'active', billing: 'Yearly', nextBilling: '2024-12-10', mrr: 20 },
  { id: 4, user: 'Grace Park', email: 'grace@example.com', plan: 'Pro', price: 24, status: 'active', billing: 'Monthly', nextBilling: '2024-07-22', mrr: 24 },
  { id: 5, user: 'John Doe', email: 'john@example.com', plan: 'Pro', price: 109, status: 'active', billing: 'Yearly', nextBilling: '2024-11-05', mrr: 9.08 },
  { id: 6, user: 'Sarah Lee', email: 'sarah@example.com', plan: 'Pro', price: 24, status: 'cancelled', billing: 'Monthly', nextBilling: '-', mrr: 0 },
  { id: 7, user: 'Mike Johnson', email: 'mike@example.com', plan: 'Pro', price: 24, status: 'past_due', billing: 'Monthly', nextBilling: '2024-06-20', mrr: 24 },
  { id: 8, user: 'Lisa Wang', email: 'lisa@example.com', plan: 'Pro', price: 109, status: 'active', billing: 'Yearly', nextBilling: '2025-01-15', mrr: 9.08 },
];

const statusColors: Record<string, string> = {
  active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  cancelled: 'bg-muted text-muted-foreground border-border',
  past_due: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
};

export default function FounderSubscriptions() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!authLoading && !(user as any)?.isAdmin) {
      setLocation("/home");
    }
  }, [authLoading, user, setLocation]);

  if (authLoading || !(user as any)?.isAdmin) return null;

  const filteredSubscriptions = mockSubscriptions.filter(
    (sub) =>
      sub.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalMrr = mockSubscriptions
    .filter((s) => s.status === 'active')
    .reduce((acc, s) => acc + s.mrr, 0);

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="page-founder-subscriptions">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground" data-testid="text-subscriptions-title">Subscriptions</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage subscriptions and billing</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-2xl font-bold text-foreground">98</p>
              <p className="text-sm text-muted-foreground">Active subs</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-emerald-500">${totalMrr.toFixed(0)}</p>
              <p className="text-sm text-muted-foreground">MRR</p>
            </div>
          </div>
        </div>

        <Card className="p-4 bg-card border-border">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-background border-border"
                data-testid="input-search-subscriptions"
              />
            </div>
            <Button variant="outline" size="sm" className="border-border text-muted-foreground">All</Button>
            <Button variant="outline" size="sm" className="border-border text-muted-foreground">Active</Button>
            <Button variant="outline" size="sm" className="border-border text-muted-foreground">Cancelled</Button>
            <Button variant="outline" size="sm" className="border-border text-muted-foreground">Past Due</Button>
          </div>
        </Card>

        <Card className="bg-card border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">User</TableHead>
                <TableHead className="text-muted-foreground">Plan</TableHead>
                <TableHead className="text-muted-foreground">Billing</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
                <TableHead className="text-muted-foreground">MRR</TableHead>
                <TableHead className="text-muted-foreground">Next Billing</TableHead>
                <TableHead className="text-muted-foreground w-12">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubscriptions.map((sub) => (
                <TableRow key={sub.id} className="border-border" data-testid={`row-subscription-${sub.id}`}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-foreground">{sub.user}</p>
                      <p className="text-sm text-muted-foreground">{sub.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-violet-500/20 text-violet-400 border-violet-500/30">{sub.plan}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{sub.billing}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusColors[sub.status]}>{sub.status}</Badge>
                  </TableCell>
                  <TableCell className="text-foreground font-medium">${sub.mrr.toFixed(2)}</TableCell>
                  <TableCell className="text-muted-foreground">{sub.nextBilling}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" data-testid={`button-actions-sub-${sub.id}`}>
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem><FileText className="w-4 h-4 mr-2" />View Invoices</DropdownMenuItem>
                        <DropdownMenuItem><RefreshCw className="w-4 h-4 mr-2" />Change Plan</DropdownMenuItem>
                        <DropdownMenuItem><CreditCard className="w-4 h-4 mr-2" />Update Payment</DropdownMenuItem>
                        <DropdownMenuItem className="text-red-500"><X className="w-4 h-4 mr-2" />Cancel Subscription</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Showing {filteredSubscriptions.length} of 98 subscriptions</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled className="border-border">Previous</Button>
            <Button variant="outline" size="sm" className="border-border">Next</Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
