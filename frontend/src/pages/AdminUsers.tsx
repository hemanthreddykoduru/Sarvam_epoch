import { Shield, Check } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { Select } from '@/components/ui/Select'
import { useAdminUsers, useUpdateUserRole } from '@/hooks/useQueries'
import { formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'
import { TableSkeleton } from '@/components/ui/PageSkeleton'

const roleBadgeVariant = (role: string) => {
  switch (role) {
    case 'superadmin': return 'danger'
    case 'admin': return 'warning'
    default: return 'info'
  }
}

const planBadgeVariant = (plan: string) => {
  switch (plan) {
    case 'enterprise': return 'danger'
    case 'professional': return 'success'
    case 'starter': return 'warning'
    default: return 'default'
  }
}

export function AdminUsers() {
  const { data: users = [], isPending } = useAdminUsers()
  const updateRole = useUpdateUserRole()

  const handleRoleChange = (userId: string, role: string) => {
    updateRole.mutate({ id: userId, role }, {
      onSuccess: () => {
        toast.success('Role updated')
      },
      onError: (err) => {
        toast.error(err.message || 'Failed to update role')
      },
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-primary/10 p-2">
          <Shield className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">User Management</h1>
      </div>

      {isPending ? (
        <TableSkeleton />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All Users</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">No users found</TableCell>
                  </TableRow>
                ) : users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.full_name || '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          options={[
                            { value: 'user', label: 'User' },
                            { value: 'admin', label: 'Admin' },
                            { value: 'superadmin', label: 'Superadmin' },
                          ]}
                          className="h-8 w-32"
                        />
                        {updateRole.isPending && (
                          <Check className="h-4 w-4 text-green-500 animate-pulse" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={planBadgeVariant(user.plan)}>{user.plan}</Badge>
                    </TableCell>
                    <TableCell>{user.credits_remaining}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(user.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
