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
import { Search, MoreVertical, UserCheck, UserX, Mail, Ban } from 'lucide-react';

const mockUsers = [
  { id: 1, name: 'Alice Martin', email: 'alice@example.com', plan: 'Pro', status: 'active', joined: '2024-01-15', lastActive: '2 hours ago' },
  { id: 2, name: 'Bob Chen', email: 'bob@example.com', plan: 'Free', status: 'active', joined: '2024-02-20', lastActive: '5 min ago' },
  { id: 3, name: 'Carla Santos', email: 'carla@example.com', plan: 'Pro', status: 'active', joined: '2024-01-08', lastActive: '1 day ago' },
  { id: 4, name: 'David Kim', email: 'david@example.com', plan: 'Free', status: 'inactive', joined: '2024-03-01', lastActive: '2 weeks ago' },
  { id: 5, name: 'Emma Wilson', email: 'emma@example.com', plan: 'Pro', status: 'active', joined: '2023-12-10', lastActive: '30 min ago' },
  { id: 6, name: 'Frank Lopez', email: 'frank@example.com', plan: 'Free', status: 'suspended', joined: '2024-02-15', lastActive: '1 month ago' },
  { id: 7, name: 'Grace Park', email: 'grace@example.com', plan: 'Pro', status: 'active', joined: '2024-01-22', lastActive: '3 hours ago' },
  { id: 8, name: 'Henry Brown', email: 'henry@example.com', plan: 'Free', status: 'active', joined: '2024-03-10', lastActive: '10 min ago' },
];

const statusColors: Record<string, string> = {
  active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  inactive: 'bg-muted text-muted-foreground border-border',
  suspended: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const planColors: Record<string, string> = {
  Pro: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
  Free: 'bg-muted text-muted-foreground border-border',
};

export default function FounderUsers() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!authLoading && !(user as any)?.isAdmin) {
      setLocation("/home");
    }
  }, [authLoading, user, setLocation]);

  if (authLoading || !(user as any)?.isAdmin) return null;

  const filteredUsers = mockUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="page-founder-users">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground" data-testid="text-users-title">Users</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage platform users and their accounts</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-2xl font-bold text-foreground">818</p>
              <p className="text-sm text-muted-foreground">Total users</p>
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
                data-testid="input-search-users"
              />
            </div>
            <Button variant="outline" size="sm" className="border-border text-muted-foreground" data-testid="button-filter-all">All</Button>
            <Button variant="outline" size="sm" className="border-border text-muted-foreground" data-testid="button-filter-pro">Pro</Button>
            <Button variant="outline" size="sm" className="border-border text-muted-foreground" data-testid="button-filter-free">Free</Button>
          </div>
        </Card>

        <Card className="bg-card border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">User</TableHead>
                <TableHead className="text-muted-foreground">Plan</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
                <TableHead className="text-muted-foreground">Joined</TableHead>
                <TableHead className="text-muted-foreground">Last Active</TableHead>
                <TableHead className="text-muted-foreground w-12">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((u) => (
                <TableRow key={u.id} className="border-border" data-testid={`row-user-${u.id}`}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 flex items-center justify-center text-white font-bold text-xs">
                        {u.name[0]}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{u.name}</p>
                        <p className="text-sm text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={planColors[u.plan]}>{u.plan}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusColors[u.status]}>{u.status}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{u.joined}</TableCell>
                  <TableCell className="text-muted-foreground">{u.lastActive}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" data-testid={`button-actions-user-${u.id}`}>
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem><UserCheck className="w-4 h-4 mr-2" />View Profile</DropdownMenuItem>
                        <DropdownMenuItem><Mail className="w-4 h-4 mr-2" />Send Email</DropdownMenuItem>
                        <DropdownMenuItem className="text-amber-500"><UserX className="w-4 h-4 mr-2" />Suspend</DropdownMenuItem>
                        <DropdownMenuItem className="text-red-500"><Ban className="w-4 h-4 mr-2" />Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Showing {filteredUsers.length} of 818 users</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled className="border-border">Previous</Button>
            <Button variant="outline" size="sm" className="border-border">Next</Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
