<script setup lang="ts">
import { toast } from "vue-sonner";
import { NuxtLink } from "#components";
import UiButton from "~/components/ui/Button.vue";
import UiDropdownMenu from "~/components/ui/dropdown-menu/DropdownMenu.vue";
import UiDropdownMenuTrigger from "~/components/ui/dropdown-menu/DropdownMenuTrigger.vue";
import UiDropdownMenuContent from "~/components/ui/dropdown-menu/DropdownMenuContent.vue";
import UiDropdownMenuItem from "~/components/ui/dropdown-menu/DropdownMenuItem.vue";
import UiAlertDialogRoot from "~/components/ui/alert-dialog/AlertDialogRoot.vue";
import UiAlertDialogPortal from "~/components/ui/alert-dialog/AlertDialogPortal.vue";
import UiAlertDialogOverlay from "~/components/ui/alert-dialog/AlertDialogOverlay.vue";
import UiAlertDialogContent from "~/components/ui/alert-dialog/AlertDialogContent.vue";
import UiAlertDialogHeader from "~/components/ui/alert-dialog/AlertDialogHeader.vue";
import UiAlertDialogFooter from "~/components/ui/alert-dialog/AlertDialogFooter.vue";
import UiAlertDialogTitle from "~/components/ui/alert-dialog/AlertDialogTitle.vue";
import UiAlertDialogDescription from "~/components/ui/alert-dialog/AlertDialogDescription.vue";
import UiAlertDialogCancel from "~/components/ui/alert-dialog/AlertDialogCancel.vue";
import UiAlertDialogAction from "~/components/ui/alert-dialog/AlertDialogAction.vue";

const route = useRoute();
const { session, isAdmin } = useCurrentUser();
const { openLogin, openRegister } = useAuthModal();
const { open: openEditProfile } = useEditProfileModal();

const logoRef = ref<HTMLElement | null>(null);
const avatarRef = ref<HTMLElement | null>(null);
const logoutDialogOpen = ref(false);
const mobileMenuOpen = ref(false);

const homeActive = computed(() => route.path === "/");
const aboutActive = computed(() => route.path === "/about");
const articlesActive = computed(() => route.path === "/articles" || route.path.startsWith("/articles/"));

function wiggleIcon(el: HTMLElement | null) {
  if (import.meta.client && el) {
    const { iconWiggle } = useGsapReveal();
    iconWiggle(el);
  }
}

function onLogoHover() {
  wiggleIcon(logoRef.value);
}

function onAvatarHover() {
  wiggleIcon(avatarRef.value);
}

function openMobileMenu() {
  mobileMenuOpen.value = true;
  if (import.meta.client) document.body.style.overflow = "hidden";
}

function closeMobileMenu() {
  mobileMenuOpen.value = false;
  if (import.meta.client) document.body.style.overflow = "";
}

function onMobileNavLink() {
  closeMobileMenu();
}

function goToContact(event: MouseEvent) {
  if (route.path !== "/") return;
  event.preventDefault();
  document
    .getElementById("communication")
    ?.scrollIntoView({ behavior: "smooth" });
  closeMobileMenu();
}

async function confirmLogout() {
  try {
    await $fetch<{ success: boolean }>("/api/signout", { method: "POST" });
  } catch {
    // ignore errors — sign out regardless
  }
  session.value.user = null;
  closeMobileMenu();
  toast.success("Αποσυνδεθήκατε");
  await navigateTo("/");
}
</script>

<template>
  <header
    class="sticky top-0 z-50 w-full border-b border-header-border bg-header-bg/90 shadow-[0_1px_10px_rgba(0,0,0,0.03)] backdrop-blur-xl"
  >
    <div
      class="relative flex h-20 w-full items-center gap-3 px-4 sm:px-6 lg:px-8"
    >
      <NuxtLink
        to="/"
        class="group/logo flex shrink-0 items-center gap-3 text-foreground"
        @mouseenter="onLogoHover"
      >
        <span
          ref="logoRef"
          class="size-9 shrink-0 overflow-hidden rounded-full ring-2 ring-primary/20 transition-all group-hover/logo:ring-primary"
          aria-hidden="true"
        >
          <img
            src="/imgs/mathe_arxaia_logo.jpg"
            alt=""
            class="size-full object-cover"
          >
        </span>
        <span
          class="font-brand text-base font-bold leading-tight tracking-tight sm:text-lg group-hover/logo:text-primary transition-colors"
        >
          Μάθε Παιδί Μου Αρχαία!
        </span>
      </NuxtLink>

      <button
        type="button"
        class="flex items-center justify-center rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground xl:hidden"
        aria-label="Άνοιγμα μενού πλοήγησης"
        @click="openMobileMenu"
      >
        <VIcon name="bi-list" class="size-5" aria-hidden="true" />
      </button>

      <div
        class="ml-auto hidden items-center gap-4 md:flex xl:absolute xl:left-1/2 xl:ml-0 xl:-translate-x-1/2"
      >
        <nav
          class="hidden items-center gap-4 font-ui text-[15px] font-bold whitespace-nowrap xl:flex"
        >
          <NuxtLink
            to="/"
            class="nav-bobble px-1 py-1"
            :class="
              homeActive
                ? 'text-primary wavy-underline'
                : 'text-muted-foreground hover:text-primary hover-wavy-orange'
            "
            :aria-current="homeActive ? 'page' : undefined"
          >
            Αρχική
          </NuxtLink>
          <NuxtLink
            to="/about"
            class="nav-bobble px-1 py-1"
            :class="
              aboutActive
                ? 'text-[#f59e0b] wavy-amber'
                : 'text-muted-foreground hover:text-[#f59e0b] hover-wavy-amber'
            "
          >
            Σχετικά
          </NuxtLink>
          <LayoutNotesMegaMenu />
          <LayoutExtrasMenu />
          <NuxtLink
            to="/articles"
            class="nav-bobble px-1 py-1"
            :class="
              articlesActive
                ? 'text-amethyst wavy-purple'
                : 'text-muted-foreground hover:text-amethyst hover-wavy-purple'
            "
            :aria-current="articlesActive ? 'page' : undefined"
          >
            Άρθρα
          </NuxtLink>
          <a
            href="/#communication"
            class="nav-bobble px-1 py-1 text-muted-foreground hover:text-rose-600 hover-wavy-rose"
            @click="goToContact"
          >
            Επικοινωνία
          </a>
        </nav>
        <SearchGlobalSearch
          hotkey
          class="w-52 shrink-0 lg:w-64 xl:w-56 2xl:w-64"
        />
      </div>

      <div class="flex shrink-0 items-center gap-2 max-md:ml-auto xl:ml-auto">
        <div class="hidden sm:block">
          <LayoutThemeLanguageControls />
        </div>
        <ClientOnly>
          <UiDropdownMenu v-if="session.user">
            <UiDropdownMenuTrigger as-child>
              <button
                type="button"
                class="group/avatar flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label="Μενού χρήστη"
                @mouseenter="onAvatarHover"
              >
                <span
                  ref="avatarRef"
                  class="flex size-full items-center justify-center overflow-hidden rounded-full bg-muted ring-2 ring-primary/20 transition-all group-hover/avatar:ring-primary"
                >
                  <img
                    v-if="session.user.avatar_url"
                    :src="session.user.avatar_url"
                    :alt="session.user.name ?? ''"
                    class="size-full object-cover"
                  >
                  <VIcon
                    v-else
                    name="bi-person-fill"
                    class="size-6 text-muted-foreground"
                    aria-hidden="true"
                  />
                </span>
              </button>
            </UiDropdownMenuTrigger>
            <UiDropdownMenuContent
              align="end"
              class="w-72 rounded-2xl border-border p-2 shadow-lg"
            >
              <div class="flex items-center gap-3 px-2 py-2">
                <div
                  class="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-primary-foreground"
                >
                  <img
                    v-if="session.user.avatar_url"
                    :src="session.user.avatar_url"
                    :alt="session.user.name ?? ''"
                    class="size-full object-cover"
                  >
                  <VIcon
                    v-else
                    name="bi-person-fill"
                    class="size-5"
                    aria-hidden="true"
                  />
                </div>
                <div class="min-w-0">
                  <div class="flex min-w-0 items-center gap-2">
                    <p class="min-w-0 truncate text-sm font-semibold leading-none">
                      {{ session.user.name ?? "Χρήστης" }}
                    </p>
                    <span
                      class="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold leading-none"
                      :class="roleChipClass(isAdmin)"
                    >
                      {{ isAdmin ? "ΔΙΑΧΕΙΡΙΣΤΗΣ" : "ΜΑΘΗΤΗΣ" }}
                    </span>
                  </div>
                  <p class="mt-1 truncate text-xs text-muted-foreground">
                    {{ session.user.email }}
                  </p>
                </div>
              </div>
              <UiDropdownMenuItem
                :class="accountMenuItemClass"
                @click="openEditProfile"
              >
                <span class="flex w-full items-center gap-3">
                  <UiIconWell>
                    <VIcon name="bi-pencil" class="size-4" aria-hidden="true" />
                  </UiIconWell>
                  <span class="min-w-0 text-left">
                    <span class="block font-semibold leading-tight">
                      Επεξεργασία προφίλ
                    </span>
                    <span
                      class="mt-0.5 block text-xs font-normal text-muted-foreground"
                    >
                      {{ profileSubtitle(session.user?.provider) }}
                    </span>
                  </span>
                </span>
              </UiDropdownMenuItem>
              <UiDropdownMenuItem
                :class="accountMenuItemClass"
              >
                <NuxtLink to="/dashboard" class="w-full">
                  <span class="flex w-full items-center gap-3">
                    <UiIconWell>
                      <VIcon
                        name="bi-journal-bookmark"
                        class="size-4"
                        aria-hidden="true"
                      />
                    </UiIconWell>
                    <span class="min-w-0 text-left">
                      <span class="block font-semibold leading-tight">
                        Το υλικό μου
                      </span>
                      <span
                        class="mt-0.5 block text-xs font-normal text-muted-foreground"
                      >
                        {{ studentMaterialSubtitle }}
                      </span>
                    </span>
                  </span>
                </NuxtLink>
              </UiDropdownMenuItem>
              <UiDropdownMenuItem
                v-if="isAdmin"
                :class="accountMenuItemClass"
              >
                <NuxtLink to="/admin" class="w-full">
                  <span class="flex w-full items-center gap-3">
                    <UiIconWell>
                      <VIcon name="bi-gear" class="size-4" aria-hidden="true" />
                    </UiIconWell>
                    <span class="min-w-0 text-left">
                      <span class="block font-semibold leading-tight">
                        Πίνακας διαχείρισης
                      </span>
                      <span
                        class="mt-0.5 block text-xs font-normal text-muted-foreground"
                      >
                        {{ adminPanelSubtitle }}
                      </span>
                    </span>
                  </span>
                </NuxtLink>
              </UiDropdownMenuItem>
              <UiDropdownMenuItem
                :class="accountMenuDestructiveClass"
                @click="logoutDialogOpen = true"
              >
                <span class="flex w-full items-center gap-3">
                  <UiIconWell tone="destructive">
                    <VIcon
                      name="bi-box-arrow-right"
                      class="size-4"
                      aria-hidden="true"
                    />
                  </UiIconWell>
                  <span class="font-semibold leading-tight">Αποσύνδεση</span>
                </span>
              </UiDropdownMenuItem>
            </UiDropdownMenuContent>
          </UiDropdownMenu>

          <UiButton
            v-else
            variant="outline"
            size="sm"
            class="rounded-lg border-2 font-semibold"
            @click="openLogin()"
          >
            Σύνδεση
          </UiButton>

          <UiAlertDialogRoot v-model:open="logoutDialogOpen">
            <UiAlertDialogPortal>
              <UiAlertDialogOverlay />
              <UiAlertDialogContent>
                <UiAlertDialogHeader>
                  <UiAlertDialogTitle>Αποσύνδεση</UiAlertDialogTitle>
                  <UiAlertDialogDescription
                    >Είστε σίγουροι ότι θέλετε να
                    αποσυνδεθείτε;</UiAlertDialogDescription
                  >
                </UiAlertDialogHeader>
                <UiAlertDialogFooter>
                  <UiAlertDialogCancel>
                    <UiButton variant="cancel">Ακύρωση</UiButton>
                  </UiAlertDialogCancel>
                  <UiAlertDialogAction as-child>
                    <UiButton variant="destructive" @click="confirmLogout">
                      Αποσύνδεση
                    </UiButton>
                  </UiAlertDialogAction>
                </UiAlertDialogFooter>
              </UiAlertDialogContent>
            </UiAlertDialogPortal>
          </UiAlertDialogRoot>

          <template #fallback>
            <span
              class="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted ring-2 ring-primary/20"
              aria-hidden="true"
            >
              <VIcon
                name="bi-person-fill"
                class="size-6 text-muted-foreground"
              />
            </span>
          </template>
        </ClientOnly>
      </div>
    </div>
  </header>

  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="mobileMenuOpen"
        class="fixed inset-0 z-100 flex flex-col overflow-y-auto bg-background/95 backdrop-blur-sm xl:hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Μενού πλοήγησης κινητού"
      >
        <div
          class="flex shrink-0 items-center justify-between border-b border-border px-4 py-4"
        >
          <NuxtLink
            to="/"
            class="flex items-center gap-2 text-foreground"
            @click="onMobileNavLink"
          >
            <span class="size-9 shrink-0 overflow-hidden rounded-full">
              <img
                src="/imgs/mathe_arxaia_logo.jpg"
                alt=""
                class="size-full object-cover"
              >
            </span>
            <span class="font-brand text-lg font-bold leading-tight"
              >Μάθε Παιδί Μου Αρχαία!</span
            >
          </NuxtLink>
          <button
            type="button"
            class="flex items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label="Κλείσιμο μενού πλοήγησης"
            @click="closeMobileMenu"
          >
            <VIcon name="bi-x" class="size-5" aria-hidden="true" />
          </button>
        </div>

        <div class="px-4 pt-4">
          <SearchGlobalSearch class="w-full" />
        </div>

        <nav class="flex flex-1 flex-col gap-1 px-4 py-4">
          <NuxtLink
            to="/"
            class="flex items-center gap-3 rounded-xl px-3 py-3 text-base font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground"
            @click="onMobileNavLink"
          >
            <VIcon
              name="bi-house-door"
              class="size-5 shrink-0"
              aria-hidden="true"
            />
            Αρχική
          </NuxtLink>
          <NuxtLink
            to="/about"
            class="flex items-center gap-3 rounded-xl px-3 py-3 text-base font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground"
            @click="onMobileNavLink"
          >
            <VIcon
              name="bi-info-circle"
              class="size-5 shrink-0"
              aria-hidden="true"
            />
            Σχετικά
          </NuxtLink>
          <LayoutNotesMegaMenu variant="mobile" @navigate="onMobileNavLink" />
          <LayoutExtrasMenu variant="mobile" @navigate="onMobileNavLink" />
          <NuxtLink
            to="/articles"
            class="flex items-center gap-3 rounded-xl px-3 py-3 text-base font-semibold hover:bg-secondary hover:text-foreground"
            :class="articlesActive ? 'text-amethyst' : 'text-muted-foreground'"
            :aria-current="articlesActive ? 'page' : undefined"
            @click="onMobileNavLink"
          >
            <VIcon
              name="bi-newspaper"
              class="size-5 shrink-0"
              aria-hidden="true"
            />
            Άρθρα
          </NuxtLink>
          <a
            href="/#communication"
            class="flex items-center gap-3 rounded-xl px-3 py-3 text-base font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground"
            @click="goToContact"
          >
            <VIcon
              name="bi-chat-dots"
              class="size-5 shrink-0"
              aria-hidden="true"
            />
            Επικοινωνία
          </a>

          <div class="my-3 border-t border-border" />

          <ClientOnly>
            <template v-if="session.user">
              <div class="mb-2 flex items-center gap-3 px-2 py-2">
                <div
                  class="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-primary-foreground"
                >
                  <img
                    v-if="session.user.avatar_url"
                    :src="session.user.avatar_url"
                    :alt="session.user.name ?? ''"
                    class="size-full object-cover"
                  >
                  <VIcon
                    v-else
                    name="bi-person-fill"
                    class="size-5"
                    aria-hidden="true"
                  />
                </div>
                <div class="min-w-0">
                  <div class="flex min-w-0 items-center gap-2">
                    <p class="min-w-0 truncate text-sm font-semibold leading-none">
                      {{ session.user.name ?? "Χρήστης" }}
                    </p>
                    <span
                      class="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold leading-none"
                      :class="roleChipClass(isAdmin)"
                    >
                      {{ isAdmin ? "ΔΙΑΧΕΙΡΙΣΤΗΣ" : "ΜΑΘΗΤΗΣ" }}
                    </span>
                  </div>
                  <p class="mt-1 truncate text-xs text-muted-foreground">
                    {{ session.user.email }}
                  </p>
                </div>
              </div>
              <button
                type="button"
                class="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-secondary"
                @click="
                  openEditProfile();
                  closeMobileMenu();
                "
              >
                <UiIconWell>
                  <VIcon name="bi-pencil" class="size-4" aria-hidden="true" />
                </UiIconWell>
                <span class="min-w-0">
                  <span class="block text-sm font-semibold leading-tight">
                    Επεξεργασία προφίλ
                  </span>
                  <span class="mt-0.5 block text-xs text-muted-foreground">
                    {{ profileSubtitle(session.user?.provider) }}
                  </span>
                </span>
              </button>
              <NuxtLink
                to="/dashboard"
                class="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-secondary"
                @click="onMobileNavLink"
              >
                <UiIconWell>
                  <VIcon
                    name="bi-journal-bookmark"
                    class="size-4"
                    aria-hidden="true"
                  />
                </UiIconWell>
                <span class="min-w-0">
                  <span class="block text-sm font-semibold leading-tight">
                    Το υλικό μου
                  </span>
                  <span class="mt-0.5 block text-xs text-muted-foreground">
                    {{ studentMaterialSubtitle }}
                  </span>
                </span>
              </NuxtLink>
              <NuxtLink
                v-if="isAdmin"
                to="/admin"
                class="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-secondary"
                @click="onMobileNavLink"
              >
                <UiIconWell>
                  <VIcon name="bi-gear" class="size-4" aria-hidden="true" />
                </UiIconWell>
                <span class="min-w-0">
                  <span class="block text-sm font-semibold leading-tight">
                    Πίνακας διαχείρισης
                  </span>
                  <span class="mt-0.5 block text-xs text-muted-foreground">
                    {{ adminPanelSubtitle }}
                  </span>
                </span>
              </NuxtLink>
              <button
                type="button"
                class="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left text-destructive hover:bg-destructive/10"
                @click="
                  logoutDialogOpen = true;
                  closeMobileMenu();
                "
              >
                <UiIconWell tone="destructive">
                  <VIcon
                    name="bi-box-arrow-right"
                    class="size-4"
                    aria-hidden="true"
                  />
                </UiIconWell>
                <span class="text-sm font-semibold leading-tight">
                  Αποσύνδεση
                </span>
              </button>
            </template>
            <template v-else>
              <button
                type="button"
                class="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-base font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground"
                @click="
                  openLogin();
                  closeMobileMenu();
                "
              >
                <VIcon
                  name="bi-person-circle"
                  class="size-5 shrink-0"
                  aria-hidden="true"
                />
                Σύνδεση
              </button>
              <button
                type="button"
                class="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-base font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground"
                @click="
                  openRegister();
                  closeMobileMenu();
                "
              >
                <VIcon
                  name="bi-person-plus"
                  class="size-5 shrink-0"
                  aria-hidden="true"
                />
                Εγγραφή
              </button>
            </template>
          </ClientOnly>
        </nav>

        <div
          class="flex shrink-0 items-center gap-3 border-t border-border px-4 py-4 sm:hidden"
        >
          <LayoutThemeLanguageControls />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
