/* Sum-IT admin: interface language (EN default, NL optional).
 *
 * - The choice is stored per browser (localStorage "sumit_admin_lang").
 * - Static markup: elements with data-t="key" get their text, data-t-ph a
 *   placeholder, data-t-label an aria-label. The page <title> uses data-t too.
 * - Scripts: SumitAdminI18n.t("key", {var: value}).
 * - Adds an EN/NL switch to the admin top bar; switching reloads the page
 *   (the editor warns first if there are unsaved changes).
 * Load this before admin.js, list.js and editor.js.
 */
(function (window, document) {
  "use strict";

  var KEY = "sumit_admin_lang";

  var D = {
    en: {
      /* shell */
      "shell.brand": "Sum-IT admin", "shell.nav": "Admin", "shell.signups": "Sign-ups", "shell.blog": "Blog",
      "shell.texts": "Site texts", "shell.logout": "Log out", "shell.lang": "Language",
      "title.list": "Blog posts · Sum-IT admin", "title.new": "New post · Sum-IT admin", "title.edit": "Edit post · Sum-IT admin",
      "title.editing": "Edit {title} · Sum-IT admin",

      /* gate / sign-in */
      "gate.checking": "Checking who you are…",
      "gate.noConfig": "The database connection is not configured (sb-config.js).",
      "gate.noConnection": "Couldn't connect to the database. Check your internet connection.",
      "gate.retry": "Try again",
      "gate.rightsError": "Couldn't check your permissions ({msg}).",
      "gate.notAdmin": "This account ({email}) doesn't have admin rights. Ask an existing admin to add you.",
      "gate.otherAccount": "Sign in with another account",
      "login.title": "Log in", "login.sub": "Log in with your admin account to manage the blog.",
      "login.titlePw": "Admin password", "login.subPw": "Enter the admin password to manage the blog.",
      "login.missingPw": "Enter the password.", "login.wrongPw": "That password is incorrect.",
      "login.email": "Email address", "login.password": "Password", "login.submit": "Log in",
      "login.forgot": "Forgot your password?", "login.missing": "Enter your email address and password.",
      "login.confirm": "Confirm your email address first via the link in your inbox.",
      "login.wrong": "Email address or password is incorrect.",
      "login.network": "No connection to the database. Please try again.",
      "login.needEmail": "Enter your email address first.",
      "login.resetFail": "Sending failed: {msg}",
      "login.rateLimit": "Too many emails were sent from this project in a short time (Supabase limit). Try again later, or ask the project owner to set a new password in Supabase (Authentication → Users).",
      "login.resetSent": "If this address is known, a reset link is on its way to your inbox.",
      "reset.title": "New password", "reset.sub": "Choose a new password of at least 12 characters.",
      "reset.label": "New password", "reset.submit": "Save", "reset.short": "Use at least 12 characters.",
      "reset.fail": "Saving failed: {msg}", "reset.done": "Password saved.",

      /* errors (store.message) */
      "err.fail": "{action} failed: {reason}.", "err.unknown": "unknown error",
      "err.duplicate": "a post with this slug already exists",
      "err.rights": "your account doesn't have permission for this",
      "err.network": "no connection to the database",
      "err.schema": "the blog_posts table in this database has different columns than the site expects. In Supabase (SQL Editor) run supabase-blog-reset.sql and then supabase-blog-setup.sql",
      "act.load": "Loading", "act.save": "Saving", "act.publish": "Publishing", "act.unpublish": "Unpublishing",
      "act.delete": "Deleting", "act.preview": "Opening the preview", "act.loadPost": "Loading the post",

      /* schema banners */
      "schema.legacy": "The database is missing the blog updates. Run supabase-setup-v5.sql and then supabase-setup-v6.sql in Supabase (SQL Editor), or supabase-blog-setup.sql on a new blog project. Until then only the title, description and content are saved.",
      "schema.v5": "Run supabase-setup-v6.sql in Supabase (SQL Editor) to save status, canonical URL and featured posts.",
      "schema.v6": "Run supabase-blog-en.sql in Supabase (SQL Editor) to save an English title and description for the blog cards.",

      /* list */
      "list.h1": "Blog posts", "list.new": "+ New post", "list.search": "Search", "list.searchPh": "Search by title or slug…",
      "list.filter": "Filter by status", "list.all": "All", "list.published": "Published", "list.draft": "Draft",
      "list.colImage": "Image", "list.colTitle": "Title", "list.colStatus": "Status", "list.colCreated": "Created",
      "list.colPublished": "Published", "list.colUpdated": "Updated", "list.colActions": "Actions",
      "list.edit": "Edit", "list.view": "View ↗", "list.preview": "Preview ↗", "list.unpublish": "Unpublish",
      "list.publish": "Publish", "list.delete": "Delete", "list.pillLive": "Published", "list.pillDraft": "Draft",
      "list.pillFeatured": "Featured", "list.noImage": "None", "list.untitled": "(untitled)",
      "list.loadFail": "Couldn't load blog posts", "list.emptyTitle": "No blog posts yet",
      "list.emptyText": "Write your first article. The existing static articles on /blog/ stay as they are.",
      "list.noResults": "No results", "list.noResultsText": "No posts match this search or filter.",
      "list.count": "{shown} of {total} posts", "list.needDesc": "Add a short description first (via Edit); it's needed for the blog card and Google.",
      "list.published.toast": "Published: {title}", "list.unpublished.toast": "Unpublished, back to draft: {title}",
      "list.confirmDelete": "Permanently delete \"{title}\"?\nThis can't be undone. Only want to take it offline? Choose \"Unpublish\" instead.",
      "list.deleted": "Post deleted.",

      /* editor */
      "ed.back": "← All blog posts", "ed.new": "New post", "ed.edit": "Edit post",
      "ed.statusNew": "New", "ed.statusDraft": "Draft", "ed.statusLive": "Published",
      "ed.article": "Article", "ed.title": "Title", "ed.slug": "Slug (URL)",
      "ed.slugAuto": "Filled in automatically from the title.", "ed.slugLocked": "The URL is fixed once a post exists, so links keep working.",
      "ed.slugInvalid": "Lowercase letters, numbers and hyphens only (3–80 characters).",
      "ed.slugTaken": "This slug is already in use. Choose another one.", "ed.slugUrl": "URL: /blog/post.html?slug={slug}",
      "ed.desc": "Short description", "ed.descHint": "Used for the blog card, the overview, Google and social previews. Required to publish.",
      "ed.keywords": "Keywords", "ed.keywordsHint": "Press Enter or comma to add, up to {max}. Shown as tags and used for SEO.",
      "ed.keywordAdd": "Add a keyword…", "ed.keywordRemove": "Remove keyword {tag}",
      "ed.category": "Category", "ed.categoryPick": "— Choose a category —", "ed.author": "Author (name shown on the site)",
      "ed.date": "Publication date", "ed.dateHint": "Empty = moment of first publication.",
      "ed.featured": "Featured (shown first in \"Latest articles\")",
      "ed.cover": "Featured image", "ed.content": "Content", "ed.blocks": "Blocks", "ed.empty": "No blocks yet. Add one.",
      "ed.addBlock": "+ Add block", "ed.pickBlock": "Choose a block type",
      "ed.seo": "SEO", "ed.seoTitle": "SEO title", "ed.seoTitleHint": "Empty = the article title.",
      "ed.seoDesc": "SEO description", "ed.seoDescHint": "Empty = the short description.",
      "ed.canonical": "Canonical URL", "ed.canonicalHint": "Only fill this in if the article is also published elsewhere. Empty = its own URL.",
      "ed.googlePreview": "Preview in Google", "ed.previewTitle": "Title", "ed.previewDesc": "Short description of the article.",
      "ed.preview": "Preview", "ed.previewSub": "How the article will look",
      "ed.saveChanges": "Save changes", "ed.unpublish": "Unpublish", "ed.saveDraft": "Save as draft",
      "ed.publish": "Publish", "ed.savePublish": "Save & publish", "ed.previewTab": "Preview ↗", "ed.viewLive": "View live ↗",
      "ed.delete": "Delete",
      "ed.msgDraft": "Saved as draft.", "ed.msgPublish": "Published! The article is now live.",
      "ed.msgSave": "Changes saved.", "ed.msgUnpublish": "Unpublished. The article is a draft again and no longer visible.",
      "ed.legacyNote": " Note: only the title, description and content were saved; run the database update for the other fields.",
      "ed.converted": "This post still had HTML content and was converted into a text block. Check the content before saving.",
      "ed.notFound": "Post not found", "ed.notFoundText": "There is no post with the slug “{slug}”. It may have been deleted.",
      "ed.loadFail": "Loading failed", "ed.noPost": "No post selected", "ed.noPostText": "Open a post from the overview.",
      "ed.toList": "Go to all blog posts", "ed.noDb": "Couldn't connect to the database",
      "ed.schemaTitle": "The database needs to be set up",
      "ed.previewFail": "Opening the preview doesn't work in this browser.",
      "ed.unsaved": "You have unsaved changes. Continue without saving?",
      "ed.confirmDelete": "Permanently delete \"{title}\"?\nThis can't be undone. Only want to take it offline? Choose \"Unpublish\" instead.",
      "ed.v5Only": "Available after the database update (supabase-setup-v5.sql).",
      "ed.v6Only": "Available after the database update (supabase-setup-v6.sql).",
      "ed.v7Only": "Available after the database update (supabase-blog-en.sql).",
      "ed.enSection": "English version (optional)", "ed.titleEn": "Title in English", "ed.descEn": "Short description in English",
      "ed.enHint": "Shown on the blog cards when a visitor switches to EN. Leave empty to show the Dutch text.",

      /* validation */
      "val.title": "Give the article a title.", "val.slug": "The slug may only contain lowercase letters, numbers and hyphens (3–80 characters).",
      "val.slugTaken": "This slug is already in use. Choose another one.", "val.desc": "Add a short description before publishing.",
      "val.coverUrl": "The featured image URL must start with https:// or /.", "val.coverAlt": "Give the featured image an alt text.",
      "val.canonical": "The canonical URL must start with https://.",
      "val.imgUrl": "Block {n}: the image URL must start with https:// or /.", "val.imgAlt": "Block {n} ({type}): alt text is missing.",

      /* image picker */
      "img.none": "No image", "img.url": "Image", "img.upload": "Upload…", "img.replace": "Replace…", "img.remove": "Remove",
      "img.removed": "Image removed.", "img.uploading": "Uploading…", "img.uploaded": "Uploaded.",
      "img.alt": "Alt text", "img.altPh": "What does it show?", "img.altHint": "Describe the image for people who can't see it. Required.",
      "img.caption": "Caption (optional)", "img.urlPh": "https://… or /path/to/image.jpg",
      "img.type": "Only JPG, PNG, WebP, GIF or AVIF.", "img.size": "File is larger than 5 MB.",
      "img.fail": "Upload failed: {msg}", "img.noBucket": "the storage folder 'blog-images' doesn't exist yet. Run the database setup SQL.",
      "img.noRights": "your account isn't allowed to upload images.", "img.network": "network error",

      /* blocks */
      "blk.rich_text": "Text", "blk.heading": "Heading", "blk.image": "Image", "blk.two_images": "Two images",
      "blk.quote": "Quote", "blk.image_text": "Image + text",
      "blk.rich_text.hint": "Paragraphs, headings, lists and links", "blk.heading.hint": "A separate section heading",
      "blk.image.hint": "One image with caption", "blk.two_images.hint": "Two images side by side",
      "blk.quote.hint": "A highlighted quote", "blk.image_text.hint": "Image next to a short text",
      "blk.drag": "Drag to move", "blk.up": "Move block up", "blk.down": "Move block down", "blk.dup": "Duplicate block",
      "blk.del": "Delete block", "blk.pos": "block {n} of {total}", "blk.unsupported": "This block type isn't supported in the editor yet; it's kept unchanged.",
      "blk.confirmDel": "Delete this block and its content?",
      "blk.level": "Level", "blk.h2": "H2 — section heading", "blk.h3": "H3 — subheading", "blk.text": "Text",
      "blk.width": "Width", "blk.widthDefault": "Text width", "blk.widthWide": "Wide", "blk.image1": "Image 1", "blk.image2": "Image 2",
      "blk.quoteText": "Quote", "blk.quoteBy": "Source / name (optional)", "blk.imgTitle": "Title",
      "blk.paraHint": "Empty line = new paragraph.", "blk.imgPos": "Image position", "blk.left": "Left", "blk.right": "Right",
      "rt.placeholder": "Write here… (headings, lists, links and quotes via the toolbar)", "rt.aria": "Text of this block",
      "rt.toolbar": "Formatting", "rt.bold": "Bold", "rt.italic": "Italic", "rt.underline": "Underline", "rt.link": "Link",
      "rt.quote": "Quote", "rt.clean": "Clear formatting", "rt.ol": "Numbered list", "rt.ul": "Bulleted list",
      "rt.image": "Insert image (below this block)", "rt.undo": "Undo", "rt.redo": "Redo",

      /* categories */
      "cat.belasting": "Tax & money", "cat.projecten": "Projects, quotes & money", "cat.samenwerken": "Working together & network",
      "cat.basis": "Starting out & admin", "cat.sum-it": "Sum-IT & comparisons"
    },

    nl: {
      "shell.brand": "Sum-IT beheer", "shell.nav": "Beheer", "shell.signups": "Aanmeldingen", "shell.blog": "Blog",
      "shell.texts": "Teksten", "shell.logout": "Uitloggen", "shell.lang": "Taal",
      "title.list": "Blogposts · Sum-IT beheer", "title.new": "Nieuwe post · Sum-IT beheer", "title.edit": "Post bewerken · Sum-IT beheer",
      "title.editing": "{title} bewerken · Sum-IT beheer",

      "gate.checking": "Even checken wie je bent…",
      "gate.noConfig": "De verbinding met de database is niet geconfigureerd (sb-config.js).",
      "gate.noConnection": "Kon geen verbinding maken met de database. Controleer je internetverbinding.",
      "gate.retry": "Opnieuw proberen",
      "gate.rightsError": "Kon je rechten niet controleren ({msg}).",
      "gate.notAdmin": "Dit account ({email}) heeft geen beheer-rechten. Vraag een bestaande beheerder om je toe te voegen.",
      "gate.otherAccount": "Met een ander account inloggen",
      "login.title": "Inloggen", "login.sub": "Log in met je beheer-account om blogs te beheren.",
      "login.titlePw": "Beheerwachtwoord", "login.subPw": "Vul het beheerwachtwoord in om de blog te beheren.",
      "login.missingPw": "Vul het wachtwoord in.", "login.wrongPw": "Dat wachtwoord klopt niet.",
      "login.email": "E-mailadres", "login.password": "Wachtwoord", "login.submit": "Inloggen",
      "login.forgot": "Wachtwoord vergeten?", "login.missing": "Vul je e-mailadres en wachtwoord in.",
      "login.confirm": "Bevestig eerst je e-mailadres via de link in je inbox.",
      "login.wrong": "E-mailadres of wachtwoord klopt niet.",
      "login.network": "Geen verbinding met de database. Probeer het opnieuw.",
      "login.needEmail": "Vul eerst je e-mailadres in.",
      "login.resetFail": "Versturen mislukt: {msg}",
      "login.rateLimit": "Er zijn kort achter elkaar te veel e-mails vanuit dit project verstuurd (limiet van Supabase). Probeer het later opnieuw, of vraag de eigenaar van het project om een nieuw wachtwoord in te stellen in Supabase (Authentication → Users).",
      "login.resetSent": "Als dit adres bekend is, staat er een herstel-link in je inbox.",
      "reset.title": "Nieuw wachtwoord", "reset.sub": "Kies een nieuw wachtwoord van minimaal 12 tekens.",
      "reset.label": "Nieuw wachtwoord", "reset.submit": "Opslaan", "reset.short": "Gebruik minimaal 12 tekens.",
      "reset.fail": "Opslaan mislukt: {msg}", "reset.done": "Wachtwoord opgeslagen.",

      "err.fail": "{action} mislukt: {reason}.", "err.unknown": "onbekende fout",
      "err.duplicate": "er bestaat al een post met deze slug",
      "err.rights": "je account heeft geen rechten voor deze actie",
      "err.network": "geen verbinding met de database",
      "err.schema": "de tabel blog_posts in deze database heeft andere kolommen dan de site verwacht. Voer in Supabase (SQL Editor) supabase-blog-reset.sql en daarna supabase-blog-setup.sql uit",
      "act.load": "Laden", "act.save": "Opslaan", "act.publish": "Publiceren", "act.unpublish": "Intrekken",
      "act.delete": "Verwijderen", "act.preview": "Voorbeeld openen", "act.loadPost": "De post laden",

      "schema.legacy": "De database mist de blog-updates. Voer supabase-setup-v5.sql en daarna supabase-setup-v6.sql uit in Supabase (SQL Editor), of supabase-blog-setup.sql op een nieuw blogproject. Tot die tijd worden alleen titel, omschrijving en inhoud bewaard.",
      "schema.v5": "Voer supabase-setup-v6.sql uit in Supabase (SQL Editor) voor status, canonical URL en uitgelichte posts.",
      "schema.v6": "Voer supabase-blog-en.sql uit in Supabase (SQL Editor) om een Engelse titel en omschrijving voor de blogkaarten op te slaan.",

      "list.h1": "Blogposts", "list.new": "+ Nieuwe post", "list.search": "Zoeken", "list.searchPh": "Zoek op titel of slug…",
      "list.filter": "Filter op status", "list.all": "Alle", "list.published": "Live", "list.draft": "Concept",
      "list.colImage": "Afbeelding", "list.colTitle": "Titel", "list.colStatus": "Status", "list.colCreated": "Aangemaakt",
      "list.colPublished": "Gepubliceerd", "list.colUpdated": "Bijgewerkt", "list.colActions": "Acties",
      "list.edit": "Bewerk", "list.view": "Bekijk ↗", "list.preview": "Voorbeeld ↗", "list.unpublish": "Intrekken",
      "list.publish": "Publiceren", "list.delete": "Verwijder", "list.pillLive": "Live", "list.pillDraft": "Concept",
      "list.pillFeatured": "Uitgelicht", "list.noImage": "Geen", "list.untitled": "(zonder titel)",
      "list.loadFail": "Blogs laden mislukt", "list.emptyTitle": "Nog geen blogposts",
      "list.emptyText": "Schrijf je eerste artikel. De vaste artikelen op /blog/ blijven gewoon bestaan.",
      "list.noResults": "Geen resultaten", "list.noResultsText": "Geen posts gevonden voor deze zoekopdracht of dit filter.",
      "list.count": "{shown} van {total} posts", "list.needDesc": "Vul eerst een korte omschrijving in (via Bewerk); die is nodig voor de blogkaart en Google.",
      "list.published.toast": "Gepubliceerd: {title}", "list.unpublished.toast": "Ingetrokken, staat weer als concept: {title}",
      "list.confirmDelete": "Post \"{title}\" definitief verwijderen?\nDit kan niet ongedaan worden gemaakt. Wil je hem alleen offline halen? Kies dan \"Intrekken\".",
      "list.deleted": "Post verwijderd.",

      "ed.back": "← Alle blogposts", "ed.new": "Nieuwe post", "ed.edit": "Post bewerken",
      "ed.statusNew": "Nieuw", "ed.statusDraft": "Concept", "ed.statusLive": "Live",
      "ed.article": "Artikel", "ed.title": "Titel", "ed.slug": "Slug (URL)",
      "ed.slugAuto": "Wordt automatisch gevuld vanuit de titel.", "ed.slugLocked": "De URL ligt vast zodra een post bestaat, zodat links blijven werken.",
      "ed.slugInvalid": "Alleen kleine letters, cijfers en streepjes (3–80 tekens).",
      "ed.slugTaken": "Deze slug is al in gebruik. Kies een andere.", "ed.slugUrl": "URL: /blog/post.html?slug={slug}",
      "ed.desc": "Korte omschrijving", "ed.descHint": "Voor de blogkaart, het overzicht, Google en social previews. Verplicht bij publiceren.",
      "ed.keywords": "Keywords", "ed.keywordsHint": "Enter of komma om toe te voegen, maximaal {max}. Worden getoond als tags en gebruikt voor SEO.",
      "ed.keywordAdd": "Keyword toevoegen…", "ed.keywordRemove": "Verwijder keyword {tag}",
      "ed.category": "Categorie", "ed.categoryPick": "— Kies een categorie —", "ed.author": "Auteur (naam op de site)",
      "ed.date": "Publicatiedatum", "ed.dateHint": "Leeg = moment van eerste publicatie.",
      "ed.featured": "Uitgelicht (bovenaan in \"Nieuwste artikelen\")",
      "ed.cover": "Uitgelichte afbeelding", "ed.content": "Inhoud", "ed.blocks": "Blokken", "ed.empty": "Nog geen blokken. Voeg er een toe.",
      "ed.addBlock": "+ Blok toevoegen", "ed.pickBlock": "Bloktype kiezen",
      "ed.seo": "SEO", "ed.seoTitle": "SEO-titel", "ed.seoTitleHint": "Leeg = de titel van het artikel.",
      "ed.seoDesc": "SEO-omschrijving", "ed.seoDescHint": "Leeg = de korte omschrijving.",
      "ed.canonical": "Canonical URL", "ed.canonicalHint": "Alleen invullen als dit artikel ook elders staat. Leeg = de eigen URL.",
      "ed.googlePreview": "Voorbeeld in Google", "ed.previewTitle": "Titel", "ed.previewDesc": "Korte omschrijving van het artikel.",
      "ed.preview": "Voorbeeld", "ed.previewSub": "Zo ziet het artikel eruit",
      "ed.saveChanges": "Wijzigingen opslaan", "ed.unpublish": "Publicatie intrekken", "ed.saveDraft": "Opslaan als concept",
      "ed.publish": "Publiceren", "ed.savePublish": "Opslaan & publiceren", "ed.previewTab": "Voorbeeld ↗", "ed.viewLive": "Bekijk live ↗",
      "ed.delete": "Verwijderen",
      "ed.msgDraft": "Opgeslagen als concept.", "ed.msgPublish": "Gepubliceerd! Het artikel staat nu live.",
      "ed.msgSave": "Wijzigingen opgeslagen.", "ed.msgUnpublish": "Publicatie ingetrokken. Het artikel is weer een concept en niet meer zichtbaar.",
      "ed.legacyNote": " Let op: alleen titel, omschrijving en inhoud zijn bewaard; voer de database-update uit voor de overige velden.",
      "ed.converted": "Deze post had nog HTML-inhoud en is omgezet naar een tekstblok. Controleer de inhoud voordat je opslaat.",
      "ed.notFound": "Post niet gevonden", "ed.notFoundText": "Er bestaat geen post met de slug “{slug}”. Misschien is hij verwijderd.",
      "ed.loadFail": "Laden mislukt", "ed.noPost": "Geen post gekozen", "ed.noPostText": "Open een post vanuit het overzicht.",
      "ed.toList": "Naar alle blogposts", "ed.noDb": "Kon geen verbinding maken met de database",
      "ed.schemaTitle": "De database moet nog worden ingericht",
      "ed.previewFail": "Voorbeeld openen lukt niet in deze browser.",
      "ed.unsaved": "Je hebt niet-opgeslagen wijzigingen. Doorgaan zonder op te slaan?",
      "ed.confirmDelete": "Post \"{title}\" definitief verwijderen?\nDit kan niet ongedaan worden gemaakt. Wil je hem alleen offline halen? Kies dan \"Publicatie intrekken\".",
      "ed.v5Only": "Beschikbaar na de database-update (supabase-setup-v5.sql).",
      "ed.v6Only": "Beschikbaar na de database-update (supabase-setup-v6.sql).",
      "ed.v7Only": "Beschikbaar na de database-update (supabase-blog-en.sql).",
      "ed.enSection": "Engelse versie (optioneel)", "ed.titleEn": "Titel in het Engels", "ed.descEn": "Korte omschrijving in het Engels",
      "ed.enHint": "Wordt op de blogkaarten getoond als een bezoeker naar EN wisselt. Leeg = de Nederlandse tekst.",

      "val.title": "Geef het artikel een titel.", "val.slug": "Slug mag alleen kleine letters, cijfers en streepjes bevatten (3–80 tekens).",
      "val.slugTaken": "Deze slug is al in gebruik. Kies een andere.", "val.desc": "Vul een korte omschrijving in voordat je publiceert.",
      "val.coverUrl": "De URL van de uitgelichte afbeelding moet met https:// of / beginnen.", "val.coverAlt": "Geef de uitgelichte afbeelding een alt-tekst.",
      "val.canonical": "De canonical URL moet met https:// beginnen.",
      "val.imgUrl": "Blok {n}: de afbeeldings-URL moet met https:// of / beginnen.", "val.imgAlt": "Blok {n} ({type}): alt-tekst ontbreekt.",

      "img.none": "Geen afbeelding", "img.url": "Afbeelding", "img.upload": "Uploaden…", "img.replace": "Vervangen…", "img.remove": "Verwijderen",
      "img.removed": "Afbeelding verwijderd.", "img.uploading": "Bezig met uploaden…", "img.uploaded": "Geüpload.",
      "img.alt": "Alt-tekst", "img.altPh": "Wat is er te zien?", "img.altHint": "Beschrijf de afbeelding voor wie hem niet kan zien. Verplicht.",
      "img.caption": "Onderschrift (optioneel)", "img.urlPh": "https://… of /pad/naar/afbeelding.jpg",
      "img.type": "Alleen JPG, PNG, WebP, GIF of AVIF.", "img.size": "Bestand is groter dan 5 MB.",
      "img.fail": "Uploaden mislukt: {msg}", "img.noBucket": "de opslagmap 'blog-images' bestaat nog niet. Voer de database-setup (SQL) uit.",
      "img.noRights": "je account mag geen afbeeldingen uploaden.", "img.network": "netwerkfout",

      "blk.rich_text": "Tekst", "blk.heading": "Tussenkop", "blk.image": "Afbeelding", "blk.two_images": "Twee afbeeldingen",
      "blk.quote": "Citaat", "blk.image_text": "Afbeelding + tekst",
      "blk.rich_text.hint": "Alinea's, kopjes, lijstjes en links", "blk.heading.hint": "Een losse tussenkop",
      "blk.image.hint": "Eén afbeelding met onderschrift", "blk.two_images.hint": "Twee afbeeldingen naast elkaar",
      "blk.quote.hint": "Een uitgelicht citaat", "blk.image_text.hint": "Afbeelding naast een korte tekst",
      "blk.drag": "Sleep om te verplaatsen", "blk.up": "Blok omhoog", "blk.down": "Blok omlaag", "blk.dup": "Blok dupliceren",
      "blk.del": "Blok verwijderen", "blk.pos": "blok {n} van {total}", "blk.unsupported": "Dit bloktype wordt nog niet ondersteund in de editor; het blijft ongewijzigd bewaard.",
      "blk.confirmDel": "Dit blok en de inhoud ervan verwijderen?",
      "blk.level": "Niveau", "blk.h2": "H2 — tussenkop", "blk.h3": "H3 — subkop", "blk.text": "Tekst",
      "blk.width": "Breedte", "blk.widthDefault": "Tekstbreedte", "blk.widthWide": "Breed", "blk.image1": "Afbeelding 1", "blk.image2": "Afbeelding 2",
      "blk.quoteText": "Citaat", "blk.quoteBy": "Bron / naam (optioneel)", "blk.imgTitle": "Titel",
      "blk.paraHint": "Lege regel = nieuwe alinea.", "blk.imgPos": "Afbeelding staat", "blk.left": "Links", "blk.right": "Rechts",
      "rt.placeholder": "Schrijf hier… (kopjes, lijstjes, links en citaten via de werkbalk)", "rt.aria": "Tekst van dit blok",
      "rt.toolbar": "Opmaak", "rt.bold": "Vet", "rt.italic": "Cursief", "rt.underline": "Onderstrepen", "rt.link": "Link",
      "rt.quote": "Citaat", "rt.clean": "Opmaak wissen", "rt.ol": "Genummerde lijst", "rt.ul": "Opsomming",
      "rt.image": "Afbeelding invoegen (onder dit blok)", "rt.undo": "Ongedaan maken", "rt.redo": "Opnieuw",

      "cat.belasting": "Belasting & geld", "cat.projecten": "Projecten, offertes & geld", "cat.samenwerken": "Samenwerken & netwerk",
      "cat.basis": "Starten & administratie", "cat.sum-it": "Sum-IT & vergelijken"
    }
  };

  var lang = "en";
  try { if (localStorage.getItem(KEY) === "nl") lang = "nl"; } catch (e) {}
  document.documentElement.lang = lang;

  function t(key, vars) {
    var s = (D[lang] && D[lang][key]) || D.en[key] || key;
    if (vars) Object.keys(vars).forEach(function (k) { s = s.split("{" + k + "}").join(vars[k]); });
    return s;
  }

  function apply(root) {
    (root || document).querySelectorAll("[data-t]").forEach(function (el) { el.textContent = t(el.getAttribute("data-t")); });
    (root || document).querySelectorAll("[data-t-ph]").forEach(function (el) { el.placeholder = t(el.getAttribute("data-t-ph")); });
    (root || document).querySelectorAll("[data-t-label]").forEach(function (el) { el.setAttribute("aria-label", t(el.getAttribute("data-t-label"))); });
  }

  function set(l) {
    try { localStorage.setItem(KEY, l); } catch (e) {}
    location.reload();
  }

  /* EN / NL switch in the admin top bar. */
  function addSwitch() {
    var bar = document.querySelector(".adm-top");
    if (!bar || bar.querySelector(".adm-lang")) return;
    var group = document.createElement("div");
    group.className = "adm-lang";
    group.setAttribute("role", "group");
    group.setAttribute("aria-label", t("shell.lang") + " / Language");
    ["en", "nl"].forEach(function (l) {
      var b = document.createElement("button");
      b.type = "button";
      b.lang = l;
      b.textContent = l.toUpperCase();
      b.setAttribute("aria-pressed", String(l === lang));
      b.addEventListener("click", function () { if (l !== lang) set(l); });
      group.appendChild(b);
    });
    var nav = bar.querySelector("nav");
    bar.insertBefore(group, nav || null);
  }

  apply();
  addSwitch();

  window.SumitAdminI18n = { t: t, lang: function () { return lang; }, apply: apply, set: set, locale: function () { return lang === "nl" ? "nl-NL" : "en-GB"; } };
})(window, document);
