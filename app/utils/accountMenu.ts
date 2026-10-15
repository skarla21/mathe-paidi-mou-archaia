export const accountMenuItemClass =
  'my-0.5 rounded-xl px-2 py-2 hover:bg-secondary focus:bg-secondary data-[highlighted]:bg-secondary'

export const accountMenuDestructiveClass =
  'my-0.5 rounded-xl px-2 py-2 text-destructive hover:bg-destructive/10 focus:bg-destructive/10 data-[highlighted]:bg-destructive/10'

export const studentMaterialSubtitle = 'Αποθηκευμένα μαθήματα'

export const adminPanelSubtitle = 'Υλικό & ρυθμίσεις'

export function profileSubtitle(provider: string | null | undefined): string {
  return (provider ?? 'credentials') === 'credentials'
    ? 'Στοιχεία & κωδικός'
    : 'Στοιχεία λογαριασμού'
}

export function roleChipClass(isAdmin: boolean): string {
  return isAdmin
    ? 'bg-amethyst-fixed text-amethyst-fixed-foreground'
    : 'bg-laurel-fixed text-laurel-fixed-foreground'
}
