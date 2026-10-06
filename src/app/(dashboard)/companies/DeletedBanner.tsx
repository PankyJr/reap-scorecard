import { Notice } from '@/components/ui/Notice'

export function DeletedBanner({ auditFailed = false }: { auditFailed?: boolean }) {
  return (
    <Notice tone="ok" title="Company deleted">
      {auditFailed ? 'The deletion was not written to the activity log. Ask an administrator to check the audit log table.' : null}
    </Notice>
  )
}
