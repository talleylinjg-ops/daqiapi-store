<template>
  <div class="container">
    <div v-if="!post" class="section-sub" style="padding: 80px 0">
      <div class="spinner"></div>
      <p>Loading post...</p>
    </div>

    <template v-else>
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <a href="/">Home</a>
        <span>/</span>
        <a href="/blog">Blog</a>
        <span>/</span>
        <span class="crumb-current">{{ post.title }}</span>
      </nav>
      <article class="post-wrap">
        <div class="post-cover">
          <img :src="post.cover" :alt="post.title" />
        </div>
        <h1 class="post-title">{{ post.title }}</h1>
        <div class="blog-meta post-meta">
          <span>{{ post.date }}</span>
          <span>&middot;</span>
          <span>{{ post.readTime }} min read</span>
          <span v-for="t in post.tags" :key="t" class="blog-tag">{{ t }}</span>
        </div>

        <div v-for="(block, i) in post.content" :key="i" class="post-body">
          <h2 v-if="block.h">{{ block.h }}</h2>
          <p v-else-if="block.p" class="post-p">{{ block.p }}</p>
          <ul v-else-if="block.list">
            <li v-for="(item, j) in block.list" :key="j">{{ item }}</li>
          </ul>
          <figure v-else-if="block.img" class="post-figure">
            <img :src="block.img" :alt="block.alt || post.title" loading="lazy" />
            <figcaption v-if="block.caption">{{ block.caption }}</figcaption>
          </figure>
          <div v-else-if="block.table" class="post-table-wrap">
            <table class="post-table">
              <thead>
                <tr>
                  <th v-for="(th, k) in block.table.head" :key="k">{{ th }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, r) in block.table.rows" :key="r">
                  <td v-for="(cell, c) in row" :key="c">{{ cell }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else-if="block.faq" class="faq-box">
            <h2 class="faq-title">Frequently asked questions ❓</h2>
            <div v-for="(f, k) in block.faq" :key="k" class="faq-item">
              <h3 class="faq-q">{{ f.q }}</h3>
              <p class="faq-a">{{ f.a }}</p>
            </div>
          </div>
        </div>

        <!-- Share buttons -->
        <div class="share-wrap">
          <span class="share-label">{{ t('shareLabel') }}</span>
          <div v-if="shareMsg" class="share-msg">{{ shareMsg }}</div>
          <div class="share-btns">
            <button
              v-for="ch in shareChannels"
              :key="ch.id"
              class="share-btn"
              :class="{ dark: ch.darkText }"
              :style="{ background: ch.color }"
              @click="share(ch)"
            >{{ ch.label }}</button>
          </div>
        </div>
      </article>

      <!-- Multilingual comment CTA: all 17 languages in one scrollable container -->
      <section class="cta-card">
        <span class="cta-title">{{ t('ctaTitle') }}</span>
        <div class="cta-langs">
          <button v-for="l in langs" :key="l.code" class="cta-lang" :class="{ active: lang === l.code }" @click="lang = l.code">{{ l.label }}</button>
        </div>
        <div class="cta-all">
          <div v-for="l in langs" :key="l.code" class="cta-row" :class="{ 'row-active': lang === l.code }" :dir="isRtl(l.code) ? 'rtl' : 'ltr'">
            <span class="cta-row-lang">{{ l.label }}</span>
            <div class="cta-lang-body">
              <p class="cta-text">{{ langText(l.code, 'ctaText') }}</p>
              <p class="cta-hint">{{ langText(l.code, 'ctaHint') }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Comments -->
      <section id="comments" class="comments-wrap">
        <div class="comments-head">
          <h2>{{ t('commentsTitle') }} ({{ total }})</h2>
          <button class="link-btn" @click="toggleSort">{{ sort === 'newest' ? t('sortOldest') : t('sortNewest') }}</button>
        </div>

        <form class="comment-form" @submit.prevent="submitComment">
          <div class="form-row">
            <input v-model="form.author" class="input" :placeholder="t('formName')" maxlength="60" />
            <input v-model="form.email" class="input" type="email" :placeholder="t('formEmail')" />
          </div>
          <textarea v-model="form.content" class="input textarea" :placeholder="t('formContent')" maxlength="1000" rows="4"></textarea>
          <div v-if="formMsg" class="form-msg" :class="{ ok: formOk }">{{ formMsg }}</div>
          <button class="btn-buy" style="max-width: 220px" :disabled="submitting">{{ submitting ? t('submitting') : t('submit') }}</button>
        </form>

        <div class="comment-list">
          <div v-for="c in comments" :key="c.id" class="comment">
            <div class="comment-head">
              <b>{{ c.author }}</b>
              <span class="comment-time">{{ fmtDate(c.createdAt) }}</span>
            </div>
            <p class="comment-body">{{ c.content }}</p>
            <div v-if="c.reply" class="comment-reply">
              <b>DaqiAPI</b>
              <p>{{ c.reply }}</p>
            </div>
          </div>
          <div v-if="!comments.length" class="comment-empty">{{ t('noComments') }}</div>
        </div>

        <div v-if="pages > 1" class="pagination">
          <button v-for="n in pages" :key="n" class="page-btn" :class="{ active: n === page }" @click="loadComments(n)">{{ n }}</button>
        </div>

        <button class="link-btn" @click="toggleAdmin">{{ showAdmin ? t('hideAdmin') : t('showAdmin') }}</button>

        <!-- Admin moderation -->
        <div v-if="showAdmin" class="admin-box">
          <div class="form-row">
            <input v-model="adminToken" class="input" type="password" :placeholder="t('adminToken')" />
            <button class="btn-nav" @click="loadPending">{{ t('adminLoad') }}</button>
          </div>
          <div v-if="adminMsg" class="form-msg">{{ adminMsg }}</div>

          <div v-if="pendingList.length" class="admin-pending">
            <div v-for="c in pendingList" :key="c.id" class="comment">
              <div class="comment-head">
                <b>{{ c.author }}</b>
                <span class="comment-time">{{ fmtDate(c.createdAt) }} &middot; {{ c.postSlug }}</span>
              </div>
              <p class="comment-body">{{ c.content }}</p>
              <div class="admin-actions">
                <button class="btn-nav" style="background: var(--green)" @click="approve(c.id)">Approve</button>
                <button class="btn-nav" style="background: #ef4444" @click="del(c.id)">Delete</button>
                <input v-model="replyTexts[c.id]" class="input" style="flex:1" placeholder="Reply..." />
                <button class="btn-nav" @click="reply(c.id)">Reply</button>
              </div>
            </div>
          </div>
          <div v-else class="comment-empty">{{ t('noPending') }}</div>

          <div class="tpl-box">
            <h3>{{ t('tplTitle') }}</h3>
            <select v-model="tplLang" class="lang-select">
              <option v-for="l in langs" :key="l.code" :value="l.code">{{ l.label }}</option>
            </select>
            <div v-for="tp in templates[tplLang]" :key="tp.label" class="tpl-item">
              <button class="tpl-copy" @click="copyTemplate(tp.text)">{{ t('tplCopy') }}</button>
              <div>
                <b>{{ tp.label }}</b>
                <p>{{ tp.text }}</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<script>
const langsMeta = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'zh', label: '中文' },
  { code: 'de', label: 'Deutsch' },
  { code: 'fr', label: 'Français' },
  { code: 'pt', label: 'Português' },
  { code: 'nl', label: 'Nederlands' },
  { code: 'pl', label: 'Polski' },
  { code: 'ru', label: 'Русский' },
  { code: 'ar', label: 'العربية' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'th', label: 'ไทย' },
  { code: 'he', label: 'עברית' },
  { code: 'vi', label: 'Tiếng Việt' },
  { code: 'id', label: 'Indonesia' },
  { code: 'kk', label: 'Қазақша' },
];

const base = {
  formName: 'Name *',
  formEmail: 'Email (optional)',
  formContent: 'Your comment...',
  submit: 'Post comment',
  submitting: 'Posting...',
  showAdmin: 'Admin moderation',
  hideAdmin: 'Hide admin panel',
  adminToken: 'Admin token',
  adminLoad: 'Load pending',
  noPending: 'No pending comments.',
  tplTitle: 'Reply templates',
  tplCopy: 'Copy',
};

const errors = {
  AUTHOR_LENGTH: 'x',
  CONTENT_LENGTH: 'x',
  EMAIL_INVALID: 'x',
  SPAM: 'x',
  RATE_LIMIT: 'x',
  DUPLICATE: 'x',
  UNAUTHORIZED: 'x',
};

const i18n = {
  en: {
    ctaTitle: 'Share your thoughts',
    ctaText: 'Did this post help you? Leave a comment below — we read every single one and reply to as many as we can.',
    ctaHint: 'Comments are moderated and published after a quick review.',
    commentsTitle: 'Comments',
    noComments: 'No comments yet. Be the first to share your thoughts!',
    sortOldest: 'Sort: oldest first',
    sortNewest: 'Sort: newest first',
    success: 'Thank you! Your comment is submitted and will appear after moderation.',
    adminTokenMsg: 'Enter the admin token to load pending comments.',
    tplCopied: 'Template copied to clipboard!',
    shareLabel: 'Share this post:',
    shareCopied: 'Link copied — paste it into {platform}.',
    ...base,
    errors: { ...errors, AUTHOR_LENGTH: 'Please enter a name between 2 and 60 characters.', CONTENT_LENGTH: 'Please enter a comment between 2 and 1000 characters.', EMAIL_INVALID: 'Please enter a valid email address.', SPAM: 'Your comment looks like spam. Please try again.', RATE_LIMIT: 'You are commenting too fast. Please wait a moment.', DUPLICATE: 'You have already posted this comment.', UNAUTHORIZED: 'Invalid admin token.' },
  },
  es: {
    ctaTitle: 'Comparte tu opinión',
    ctaText: '¿Te ayudó esta publicación? Deja un comentario abajo: leemos todos y respondemos a la mayoría.',
    ctaHint: 'Los comentarios se moderan y se publican tras una revisión rápida.',
    commentsTitle: 'Comentarios',
    noComments: 'Aún no hay comentarios. ¡Sé el primero en compartir tu opinión!',
    sortOldest: 'Orden: más antiguos',
    sortNewest: 'Orden: más recientes',
    success: '¡Gracias! Tu comentario se ha enviado y aparecerá después de la moderación.',
    adminTokenMsg: 'Introduce el token de admin para cargar comentarios pendientes.',
    tplCopied: '¡Plantilla copiada al portapapeles!',
    shareLabel: 'Comparte esta publicación:',
    shareCopied: 'Enlace copiado — pégalo en {platform}.',
    formName: 'Nombre *', formEmail: 'Correo (opcional)', formContent: 'Tu comentario...', submit: 'Publicar comentario', submitting: 'Publicando...', showAdmin: 'Moderación admin', hideAdmin: 'Ocultar panel admin', adminToken: 'Token de admin', adminLoad: 'Cargar pendientes', noPending: 'No hay comentarios pendientes.', tplTitle: 'Plantillas de respuesta', tplCopy: 'Copiar',
    errors: { ...errors, AUTHOR_LENGTH: 'Introduce un nombre de entre 2 y 60 caracteres.', CONTENT_LENGTH: 'Introduce un comentario de entre 2 y 1000 caracteres.', EMAIL_INVALID: 'Introduce una dirección de correo válida.', SPAM: 'Tu comentario parece spam. Inténtalo de nuevo.', RATE_LIMIT: 'Estás comentando demasiado rápido. Espera un momento.', DUPLICATE: 'Ya has publicado este comentario.', UNAUTHORIZED: 'Token de admin inválido.' },
  },
  zh: {
    ctaTitle: '分享您的想法',
    ctaText: '这篇文章对您有帮助吗？请在下方留言——我们会阅读每一条评论并尽可能回复。',
    ctaHint: '评论需经过审核后才会显示。',
    commentsTitle: '评论',
    noComments: '还没有评论，快来抢沙发！',
    sortOldest: '排序：从旧到新',
    sortNewest: '排序：从新到旧',
    success: '感谢您的评论！已提交，审核后即可显示。',
    adminTokenMsg: '请输入管理员令牌以加载待审核评论。',
    tplCopied: '模板已复制到剪贴板！',
    shareLabel: '分享这篇文章：',
    shareCopied: '链接已复制 — 请粘贴到 {platform}。',
    formName: '昵称 *', formEmail: '邮箱（可选）', formContent: '您的评论...', submit: '发表评论', submitting: '发布中...', showAdmin: '管理审核', hideAdmin: '隐藏管理面板', adminToken: '管理员令牌', adminLoad: '加载待审核', noPending: '暂无待审核评论。', tplTitle: '回复模板', tplCopy: '复制',
    errors: { ...errors, AUTHOR_LENGTH: '昵称长度需在 2-60 个字符之间。', CONTENT_LENGTH: '评论长度需在 2-1000 个字符之间。', EMAIL_INVALID: '请输入有效的邮箱地址。', SPAM: '您的评论疑似垃圾信息，请重试。', RATE_LIMIT: '评论过于频繁，请稍后再试。', DUPLICATE: '您已发表过这条评论。', UNAUTHORIZED: '管理员令牌无效。' },
  },
  de: {
    ctaTitle: 'Teile deine Gedanken', ctaText: 'Hat dir dieser Beitrag geholfen? Hinterlasse unten einen Kommentar – wir lesen jeden einzelnen und antworten so vielen wie möglich.', ctaHint: 'Kommentare werden moderiert und nach einer kurzen Prüfung veröffentlicht.',
    commentsTitle: 'Kommentare', noComments: 'Noch keine Kommentare. Sei der Erste!', sortOldest: 'Sortierung: älteste zuerst', sortNewest: 'Sortierung: neueste zuerst', success: 'Danke! Dein Kommentar wurde übermittelt und erscheint nach der Moderation.', adminTokenMsg: 'Gib das Admin-Token ein, um ausstehende Kommentare zu laden.', tplCopied: 'Vorlage in die Zwischenablage kopiert!', shareLabel: 'Diesen Beitrag teilen:', shareCopied: 'Link kopiert – füge ihn in {platform} ein.',
    formName: 'Name *', formEmail: 'E-Mail (optional)', formContent: 'Dein Kommentar...', submit: 'Kommentar posten', submitting: 'Wird gepostet...', showAdmin: 'Admin-Moderation', hideAdmin: 'Admin-Panel ausblenden', adminToken: 'Admin-Token', adminLoad: 'Ausstehend laden', noPending: 'Keine ausstehenden Kommentare.', tplTitle: 'Antwortvorlagen', tplCopy: 'Kopieren',
    errors: { ...errors, AUTHOR_LENGTH: 'Bitte gib einen Namen zwischen 2 und 60 Zeichen ein.', CONTENT_LENGTH: 'Bitte gib einen Kommentar zwischen 2 und 1000 Zeichen ein.', EMAIL_INVALID: 'Bitte gib eine gültige E-Mail-Adresse ein.', SPAM: 'Dein Kommentar sieht nach Spam aus. Bitte versuche es erneut.', RATE_LIMIT: 'Du kommentierst zu schnell. Bitte warte einen Moment.', DUPLICATE: 'Du hast diesen Kommentar bereits gepostet.', UNAUTHORIZED: 'Ungültiges Admin-Token.' },
  },
  fr: {
    ctaTitle: 'Partagez votre avis', ctaText: 'Cet article vous a-t-il aidé ? Laissez un commentaire ci-dessous – nous les lisons tous et répondons au plus grand nombre.', ctaHint: 'Les commentaires sont modérés et publiés après une vérification rapide.',
    commentsTitle: 'Commentaires', noComments: 'Aucun commentaire pour le moment. Soyez le premier !', sortOldest: 'Tri : plus anciens', sortNewest: 'Tri : plus récents', success: 'Merci ! Votre commentaire a été envoyé et apparaîtra après modération.', adminTokenMsg: 'Entrez le jeton admin pour charger les commentaires en attente.', tplCopied: 'Modèle copié dans le presse-papiers !', shareLabel: 'Partager cet article :', shareCopied: 'Lien copié – collez-le dans {platform}.',
    formName: 'Nom *', formEmail: 'E-mail (facultatif)', formContent: 'Votre commentaire...', submit: 'Publier le commentaire', submitting: 'Publication...', showAdmin: 'Modération admin', hideAdmin: 'Masquer le panneau admin', adminToken: 'Jeton admin', adminLoad: 'Charger en attente', noPending: 'Aucun commentaire en attente.', tplTitle: 'Modèles de réponse', tplCopy: 'Copier',
    errors: { ...errors, AUTHOR_LENGTH: 'Veuillez saisir un nom entre 2 et 60 caractères.', CONTENT_LENGTH: 'Veuillez saisir un commentaire entre 2 et 1000 caractères.', EMAIL_INVALID: 'Veuillez saisir une adresse e-mail valide.', SPAM: 'Votre commentaire ressemble à du spam. Veuillez réessayer.', RATE_LIMIT: 'Vous commentez trop rapidement. Veuillez patienter.', DUPLICATE: 'Vous avez déjà publié ce commentaire.', UNAUTHORIZED: 'Jeton admin invalide.' },
  },
  pt: {
    ctaTitle: 'Compartilhe sua opinião', ctaText: 'Este artigo ajudou você? Deixe um comentário abaixo – lemos todos e respondemos à maioria.', ctaHint: 'Os comentários são moderados e publicados após uma revisão rápida.',
    commentsTitle: 'Comentários', noComments: 'Ainda não há comentários. Seja o primeiro!', sortOldest: 'Ordenar: mais antigos', sortNewest: 'Ordenar: mais recentes', success: 'Obrigado! Seu comentário foi enviado e aparecerá após a moderação.', adminTokenMsg: 'Digite o token admin para carregar comentários pendentes.', tplCopied: 'Modelo copiado para a área de transferência!', shareLabel: 'Compartilhe este artigo:', shareCopied: 'Link copiado – cole-o no {platform}.',
    formName: 'Nome *', formEmail: 'E-mail (opcional)', formContent: 'Seu comentário...', submit: 'Publicar comentário', submitting: 'Publicando...', showAdmin: 'Moderação admin', hideAdmin: 'Ocultar painel admin', adminToken: 'Token admin', adminLoad: 'Carregar pendentes', noPending: 'Nenhum comentário pendente.', tplTitle: 'Modelos de resposta', tplCopy: 'Copiar',
    errors: { ...errors, AUTHOR_LENGTH: 'Digite um nome entre 2 e 60 caracteres.', CONTENT_LENGTH: 'Digite um comentário entre 2 e 1000 caracteres.', EMAIL_INVALID: 'Digite um endereço de e-mail válido.', SPAM: 'Seu comentário parece spam. Tente novamente.', RATE_LIMIT: 'Você está comentando rápido demais. Aguarde um momento.', DUPLICATE: 'Você já publicou este comentário.', UNAUTHORIZED: 'Token admin inválido.' },
  },
  nl: {
    ctaTitle: 'Deel je mening', ctaText: 'Heeft dit bericht je geholpen? Laat hieronder een reactie achter – we lezen ze allemaal en beantwoorden zoveel mogelijk.', ctaHint: 'Reacties worden gemodereerd en na een korte controle gepubliceerd.',
    commentsTitle: 'Reacties', noComments: 'Nog geen reacties. Wees de eerste!', sortOldest: 'Sorteer: oudste eerst', sortNewest: 'Sorteer: nieuwste eerst', success: 'Bedankt! Je reactie is verzonden en verschijnt na moderatie.', adminTokenMsg: 'Voer het admin-token in om wachtende reacties te laden.', tplCopied: 'Sjabloon gekopieerd naar klembord!', shareLabel: 'Deel dit bericht:', shareCopied: 'Link gekopieerd – plak deze in {platform}.',
    formName: 'Naam *', formEmail: 'E-mail (optioneel)', formContent: 'Jouw reactie...', submit: 'Reactie plaatsen', submitting: 'Plaatsen...', showAdmin: 'Admin-moderatie', hideAdmin: 'Admin-paneel verbergen', adminToken: 'Admin-token', adminLoad: 'Wachtenden laden', noPending: 'Geen wachtende reacties.', tplTitle: 'Reactiesjablonen', tplCopy: 'Kopiëren',
    errors: { ...errors, AUTHOR_LENGTH: 'Voer een naam in van 2 tot 60 tekens.', CONTENT_LENGTH: 'Voer een reactie in van 2 tot 1000 tekens.', EMAIL_INVALID: 'Voer een geldig e-mailadres in.', SPAM: 'Je reactie ziet eruit als spam. Probeer het opnieuw.', RATE_LIMIT: 'Je reageert te snel. Wacht even.', DUPLICATE: 'Je hebt deze reactie al geplaatst.', UNAUTHORIZED: 'Ongeldig admin-token.' },
  },
  pl: {
    ctaTitle: 'Podziel się swoją opinią', ctaText: 'Czy ten post Ci pomógł? Zostaw komentarz poniżej – czytamy każdy i odpowiadamy na tyle, na ile możemy.', ctaHint: 'Komentarze są moderowane i publikowane po szybkiej weryfikacji.',
    commentsTitle: 'Komentarze', noComments: 'Brak komentarzy. Bądź pierwszy!', sortOldest: 'Sortuj: od najstarszych', sortNewest: 'Sortuj: od najnowszych', success: 'Dziękujemy! Twój komentarz został wysłany i pojawi się po moderacji.', adminTokenMsg: 'Wprowadź token admina, aby wczytać oczekujące komentarze.', tplCopied: 'Szablon skopiowany do schowka!', shareLabel: 'Udostępnij ten post:', shareCopied: 'Link skopiowany – wklej go w {platform}.',
    formName: 'Imię *', formEmail: 'E-mail (opcjonalnie)', formContent: 'Twój komentarz...', submit: 'Opublikuj komentarz', submitting: 'Publikowanie...', showAdmin: 'Moderacja admin', hideAdmin: 'Ukryj panel admina', adminToken: 'Token admina', adminLoad: 'Wczytaj oczekujące', noPending: 'Brak oczekujących komentarzy.', tplTitle: 'Szablony odpowiedzi', tplCopy: 'Kopiuj',
    errors: { ...errors, AUTHOR_LENGTH: 'Wpisz imię o długości od 2 do 60 znaków.', CONTENT_LENGTH: 'Wpisz komentarz o długości od 2 do 1000 znaków.', EMAIL_INVALID: 'Wpisz poprawny adres e-mail.', SPAM: 'Twój komentarz wygląda jak spam. Spróbuj ponownie.', RATE_LIMIT: 'Komentujesz zbyt szybko. Poczekaj chwilę.', DUPLICATE: 'Już opublikowałeś ten komentarz.', UNAUTHORIZED: 'Nieprawidłowy token admina.' },
  },
  ru: {
    ctaTitle: 'Поделитесь своим мнением', ctaText: 'Эта статья помогла вам? Оставьте комментарий ниже — мы читаем каждый и отвечаем на большинство.', ctaHint: 'Комментарии модерируются и публикуются после быстрой проверки.',
    commentsTitle: 'Комментарии', noComments: 'Комментариев пока нет. Будьте первым!', sortOldest: 'Сортировка: старые сначала', sortNewest: 'Сортировка: новые сначала', success: 'Спасибо! Ваш комментарий отправлен и появится после модерации.', adminTokenMsg: 'Введите токен администратора, чтобы загрузить ожидающие комментарии.', tplCopied: 'Шаблон скопирован в буфер обмена!', shareLabel: 'Поделиться статьей:', shareCopied: 'Ссылка скопирована — вставьте её в {platform}.',
    formName: 'Имя *', formEmail: 'Email (необязательно)', formContent: 'Ваш комментарий...', submit: 'Оставить комментарий', submitting: 'Отправка...', showAdmin: 'Модерация', hideAdmin: 'Скрыть панель', adminToken: 'Токен администратора', adminLoad: 'Загрузить ожидающие', noPending: 'Нет ожидающих комментариев.', tplTitle: 'Шаблоны ответов', tplCopy: 'Копировать',
    errors: { ...errors, AUTHOR_LENGTH: 'Введите имя длиной от 2 до 60 символов.', CONTENT_LENGTH: 'Введите комментарий длиной от 2 до 1000 символов.', EMAIL_INVALID: 'Введите корректный адрес электронной почты.', SPAM: 'Ваш комментарий похож на спам. Попробуйте ещё раз.', RATE_LIMIT: 'Вы комментируете слишком часто. Подождите немного.', DUPLICATE: 'Вы уже оставляли этот комментарий.', UNAUTHORIZED: 'Неверный токен администратора.' },
  },
  ar: {
    ctaTitle: 'شارك رأيك', ctaText: 'هل ساعدك هذا المقال؟ اترك تعليقًا أدناه — نقرأ كل تعليق ونرد على أكبر عدد ممكن.', ctaHint: 'تتم مراجعة التعليقات وتنشر بعد التحقق السريع.',
    commentsTitle: 'التعليقات', noComments: 'لا توجد تعليقات بعد. كن أول من يشارك!', sortOldest: 'ترتيب: الأقدم أولًا', sortNewest: 'ترتيب: الأحدث أولًا', success: 'شكرًا! تم إرسال تعليقك وسيظهر بعد المراجعة.', adminTokenMsg: 'أدخل رمز المشرف لتحميل التعليقات المعلقة.', tplCopied: 'تم نسخ القالب إلى الحافظة!', shareLabel: 'شارك هذه المقالة:', shareCopied: 'تم نسخ الرابط — الصقه في {platform}.',
    formName: 'الاسم *', formEmail: 'البريد الإلكتروني (اختياري)', formContent: 'تعليقك...', submit: 'نشر التعليق', submitting: 'جارٍ النشر...', showAdmin: 'إشراف المشرف', hideAdmin: 'إخفاء لوحة المشرف', adminToken: 'رمز المشرف', adminLoad: 'تحميل المعلق', noPending: 'لا توجد تعليقات معلقة.', tplTitle: 'قوالب الرد', tplCopy: 'نسخ',
    errors: { ...errors, AUTHOR_LENGTH: 'يرجى إدخال اسم بين 2 و60 حرفًا.', CONTENT_LENGTH: 'يرجى إدخال تعليق بين 2 و1000 حرف.', EMAIL_INVALID: 'يرجى إدخال بريد إلكتروني صالح.', SPAM: 'يبدو أن تعليقك غير مرغوب فيه. حاول مرة أخرى.', RATE_LIMIT: 'أنت تعلق بسرعة كبيرة. يرجى الانتظار قليلًا.', DUPLICATE: 'لقد نشرت هذا التعليق بالفعل.', UNAUTHORIZED: 'رمز المشرف غير صالح.' },
  },
  ja: {
    ctaTitle: '感想を共有する', ctaText: 'この記事は役に立ちましたか？下のコメント欄にぜひ投稿してください。すべて読んで、できる限り返信します。', ctaHint: 'コメントはモデレーション後に公開されます。',
    commentsTitle: 'コメント', noComments: 'まだコメントはありません。最初のコメントを投稿しましょう！', sortOldest: '並び替え: 古い順', sortNewest: '並び替え: 新しい順', success: 'ありがとうございます！コメントは送信され、モデレーション後に表示されます。', adminTokenMsg: '管理者トークンを入力して保留中のコメントを読み込みます。', tplCopied: 'テンプレートをクリップボードにコピーしました！', shareLabel: 'この記事をシェア：', shareCopied: 'リンクをコピーしました — {platform} に貼り付けてください。',
    formName: 'お名前 *', formEmail: 'メール（任意）', formContent: 'コメント...', submit: 'コメントを投稿', submitting: '投稿中...', showAdmin: '管理モデレーション', hideAdmin: '管理パネルを隠す', adminToken: '管理者トークン', adminLoad: '保留中を読み込む', noPending: '保留中のコメントはありません。', tplTitle: '返信テンプレート', tplCopy: 'コピー',
    errors: { ...errors, AUTHOR_LENGTH: '名前は2〜60文字で入力してください。', CONTENT_LENGTH: 'コメントは2〜1000文字で入力してください。', EMAIL_INVALID: '有効なメールアドレスを入力してください。', SPAM: 'コメントがスパムと判断されました。もう一度お試しください。', RATE_LIMIT: '投稿が早すぎます。少し待ってください。', DUPLICATE: 'このコメントは既に投稿されています。', UNAUTHORIZED: '管理者トークンが無効です。' },
  },
  ko: {
    ctaTitle: '의견을 공유하세요', ctaText: '이 글이 도움이 되었나요? 아래에 댓글을 남겨주세요 — 모든 댓글을 읽고 최대한 많이 답변합니다.', ctaHint: '댓글은 검토 후 게시됩니다.',
    commentsTitle: '댓글', noComments: '아직 댓글이 없습니다. 첫 댓글을 남겨보세요!', sortOldest: '정렬: 오래된 순', sortNewest: '정렬: 최신 순', success: '감사합니다! 댓글이 제출되었으며 검토 후 표시됩니다.', adminTokenMsg: '대기 중인 댓글을 로드하려면 관리자 토큰을 입력하세요.', tplCopied: '템플릿이 클립보드에 복사되었습니다!', shareLabel: '이 글 공유하기:', shareCopied: '링크가 복사되었습니다 — {platform}에 붙여넣으세요.',
    formName: '이름 *', formEmail: '이메일 (선택)', formContent: '댓글...', submit: '댓글 게시', submitting: '게시 중...', showAdmin: '관리자 검토', hideAdmin: '관리자 패널 숨기기', adminToken: '관리자 토큰', adminLoad: '대기 중 로드', noPending: '대기 중인 댓글이 없습니다.', tplTitle: '답변 템플릿', tplCopy: '복사',
    errors: { ...errors, AUTHOR_LENGTH: '이름은 2~60자로 입력해 주세요.', CONTENT_LENGTH: '댓글은 2~1000자로 입력해 주세요.', EMAIL_INVALID: '유효한 이메일 주소를 입력해 주세요.', SPAM: '댓글이 스팸으로 보입니다. 다시 시도해 주세요.', RATE_LIMIT: '너무 빠르게 댓글을 작성하고 있습니다. 잠시 기다려 주세요.', DUPLICATE: '이미 이 댓글을 게시했습니다.', UNAUTHORIZED: '관리자 토큰이 유효하지 않습니다.' },
  },
  th: {
    ctaTitle: 'แบ่งปันความคิดเห็นของคุณ', ctaText: 'บทความนี้ช่วยคุณได้ไหม? แสดงความคิดเห็นด้านล่าง — เราอ่านทุกความเห็นและตอบกลับให้มากที่สุด', ctaHint: 'ความคิดเห็นจะถูกตรวจสอบและเผยแพร่หลังจากการพิจารณา',
    commentsTitle: 'ความคิดเห็น', noComments: 'ยังไม่มีความคิดเห็น เป็นคนแรกที่แบ่งปัน!', sortOldest: 'เรียง: เก่าที่สุดก่อน', sortNewest: 'เรียง: ใหม่ที่สุดก่อน', success: 'ขอบคุณ! ความคิดเห็นของคุณถูกส่งแล้วและจะแสดงหลังการตรวจสอบ', adminTokenMsg: 'ป้อนโทเค็นผู้ดูแลเพื่อโหลดความคิดเห็นที่รอตรวจ', tplCopied: 'คัดลอกเทมเพลตไปยังคลิปบอร์ดแล้ว!', shareLabel: 'แชร์บทความนี้:', shareCopied: 'คัดลอกลิงก์แล้ว — วางใน {platform}',
    formName: 'ชื่อ *', formEmail: 'อีเมล (ไม่บังคับ)', formContent: 'ความคิดเห็นของคุณ...', submit: 'โพสต์ความคิดเห็น', submitting: 'กำลังโพสต์...', showAdmin: 'การกลั่นกรองผู้ดูแล', hideAdmin: 'ซ่อนแผงผู้ดูแล', adminToken: 'โทเค็นผู้ดูแล', adminLoad: 'โหลดที่รอตรวจ', noPending: 'ไม่มีความคิดเห็นที่รอตรวจ', tplTitle: 'เทมเพลตการตอบกลับ', tplCopy: 'คัดลอก',
    errors: { ...errors, AUTHOR_LENGTH: 'กรุณากรอกชื่อระหว่าง 2 ถึง 60 ตัวอักษร', CONTENT_LENGTH: 'กรุณากรอกความคิดเห็นระหว่าง 2 ถึง 1000 ตัวอักษร', EMAIL_INVALID: 'กรุณากรอกอีเมลที่ถูกต้อง', SPAM: 'ความคิดเห็นของคุณดูเหมือนสแปม กรุณาลองอีกครั้ง', RATE_LIMIT: 'คุณแสดงความคิดเห็นเร็วเกินไป กรุณารอสักครู่', DUPLICATE: 'คุณได้โพสต์ความคิดเห็นนี้แล้ว', UNAUTHORIZED: 'โทเค็นผู้ดูแลไม่ถูกต้อง' },
  },
  he: {
    ctaTitle: 'שתפו את דעתכם', ctaText: 'האם המאמר עזר לכם? השאירו תגובה למטה — אנחנו קוראים כל תגובה ועונים לרובן.', ctaHint: 'תגובות עוברות ניהול ומתפרסמות לאחר בדיקה מהירה.',
    commentsTitle: 'תגובות', noComments: 'אין עדיין תגובות. היו הראשונים!', sortOldest: 'מיון: הישנות ראשונות', sortNewest: 'מיון: חדשות ראשונות', success: 'תודה! התגובה נשלחה ותופיע לאחר הניהול.', adminTokenMsg: 'הזינו טוקן אדמין כדי לטעון תגובות ממתינות.', tplCopied: 'התבנית הועתקה ללוח!', shareLabel: 'שתפו את המאמר:', shareCopied: 'הקישור הועתק — הדביקו אותו ב-{platform}.',
    formName: 'שם *', formEmail: 'אימייל (אופציונלי)', formContent: 'התגובה שלך...', submit: 'פרסם תגובה', submitting: 'מפרסם...', showAdmin: 'ניהול אדמין', hideAdmin: 'הסתר לוח אדמין', adminToken: 'טוקן אדמין', adminLoad: 'טען ממתינות', noPending: 'אין תגובות ממתינות.', tplTitle: 'תבניות תשובה', tplCopy: 'העתק',
    errors: { ...errors, AUTHOR_LENGTH: 'אנא הזינו שם בין 2 ל-60 תווים.', CONTENT_LENGTH: 'אנא הזינו תגובה בין 2 ל-1000 תווים.', EMAIL_INVALID: 'אנא הזינו כתובת אימייל תקינה.', SPAM: 'התגובה נראית כמו ספאם. נסו שוב.', RATE_LIMIT: 'אתם מגיבים מהר מדי. המתינו רגע.', DUPLICATE: 'כבר פרסמתם תגובה זו.', UNAUTHORIZED: 'טוקן אדמין לא תקין.' },
  },
  vi: {
    ctaTitle: 'Chia sẻ ý kiến của bạn', ctaText: 'Bài viết này có giúp bạn không? Hãy để lại bình luận bên dưới — chúng tôi đọc từng bình luận và phản hồi nhiều nhất có thể.', ctaHint: 'Bình luận được kiểm duyệt và xuất hiện sau khi xét duyệt nhanh.',
    commentsTitle: 'Bình luận', noComments: 'Chưa có bình luận nào. Hãy là người đầu tiên!', sortOldest: 'Sắp xếp: cũ nhất trước', sortNewest: 'Sắp xếp: mới nhất trước', success: 'Cảm ơn bạn! Bình luận đã được gửi và sẽ hiển thị sau khi kiểm duyệt.', adminTokenMsg: 'Nhập token admin để tải bình luận chờ duyệt.', tplCopied: 'Đã sao chép mẫu vào clipboard!', shareLabel: 'Chia sẻ bài viết này:', shareCopied: 'Đã sao chép liên kết — dán vào {platform}.',
    formName: 'Tên *', formEmail: 'Email (không bắt buộc)', formContent: 'Bình luận của bạn...', submit: 'Đăng bình luận', submitting: 'Đang đăng...', showAdmin: 'Kiểm duyệt admin', hideAdmin: 'Ẩn bảng admin', adminToken: 'Token admin', adminLoad: 'Tải chờ duyệt', noPending: 'Không có bình luận chờ duyệt.', tplTitle: 'Mẫu trả lời', tplCopy: 'Sao chép',
    errors: { ...errors, AUTHOR_LENGTH: 'Vui lòng nhập tên từ 2 đến 60 ký tự.', CONTENT_LENGTH: 'Vui lòng nhập bình luận từ 2 đến 1000 ký tự.', EMAIL_INVALID: 'Vui lòng nhập địa chỉ email hợp lệ.', SPAM: 'Bình luận của bạn có vẻ là spam. Vui lòng thử lại.', RATE_LIMIT: 'Bạn đang bình luận quá nhanh. Vui lòng đợi một chút.', DUPLICATE: 'Bạn đã đăng bình luận này rồi.', UNAUTHORIZED: 'Token admin không hợp lệ.' },
  },
  id: {
    ctaTitle: 'Bagikan pendapat Anda', ctaText: 'Apakah artikel ini membantu Anda? Tinggalkan komentar di bawah — kami membaca semuanya dan membalas sebanyak mungkin.', ctaHint: 'Komentar dimoderasi dan dipublikasikan setelah pemeriksaan cepat.',
    commentsTitle: 'Komentar', noComments: 'Belum ada komentar. Jadilah yang pertama!', sortOldest: 'Urutkan: terlama dulu', sortNewest: 'Urutkan: terbaru dulu', success: 'Terima kasih! Komentar Anda telah dikirim dan akan muncul setelah moderasi.', adminTokenMsg: 'Masukkan token admin untuk memuat komentar tertunda.', tplCopied: 'Template disalin ke clipboard!', shareLabel: 'Bagikan artikel ini:', shareCopied: 'Tautan disalin — tempel di {platform}.',
    formName: 'Nama *', formEmail: 'Email (opsional)', formContent: 'Komentar Anda...', submit: 'Kirim komentar', submitting: 'Mengirim...', showAdmin: 'Moderasi admin', hideAdmin: 'Sembunyikan panel admin', adminToken: 'Token admin', adminLoad: 'Muat yang tertunda', noPending: 'Tidak ada komentar tertunda.', tplTitle: 'Template balasan', tplCopy: 'Salin',
    errors: { ...errors, AUTHOR_LENGTH: 'Masukkan nama antara 2 hingga 60 karakter.', CONTENT_LENGTH: 'Masukkan komentar antara 2 hingga 1000 karakter.', EMAIL_INVALID: 'Masukkan alamat email yang valid.', SPAM: 'Komentar Anda tampak seperti spam. Coba lagi.', RATE_LIMIT: 'Anda berkomentar terlalu cepat. Mohon tunggu sebentar.', DUPLICATE: 'Anda sudah mengirim komentar ini.', UNAUTHORIZED: 'Token admin tidak valid.' },
  },
  kk: {
    ctaTitle: 'Пікіріңізбен бөлісіңіз', ctaText: 'Бұл мақала сізге көмектесті ме? Төменде пікір қалдырыңыз — біз әрқайсысын оқып, мүмкіндігінше көбіне жауап береміз.', ctaHint: 'Пікірлер модерациядан өтіп, тексерілгеннен кейін жарияланады.',
    commentsTitle: 'Пікірлер', noComments: 'Әзірге пікір жоқ. Бірінші болыңыз!', sortOldest: 'Сұрыптау: ескісі бірінші', sortNewest: 'Сұрыптау: жаңасы бірінші', success: 'Рақмет! Пікіріңіз жіберілді және модерациядан кейін көрсетіледі.', adminTokenMsg: 'Күтудегі пікірлерді жүктеу үшін админ токенін енгізіңіз.', tplCopied: 'Үлгі алмасу буферіне көшірілді!', shareLabel: 'Бұл мақаланы бөлісу:', shareCopied: 'Сілтеме көшірілді — оны {platform} ішіне қойыңыз.',
    formName: 'Атыңыз *', formEmail: 'Email (міндетті емес)', formContent: 'Пікіріңіз...', submit: 'Пікір қалдыру', submitting: 'Жіберілуде...', showAdmin: 'Админ модерациясы', hideAdmin: 'Админ панелін жасыру', adminToken: 'Админ токені', adminLoad: 'Күтудегілерді жүктеу', noPending: 'Күтудегі пікірлер жоқ.', tplTitle: 'Жауап үлгілері', tplCopy: 'Көшіру',
    errors: { ...errors, AUTHOR_LENGTH: '2-тен 60-қа дейінгі атауды енгізіңіз.', CONTENT_LENGTH: '2-ден 1000-ға дейінгі пікірді енгізіңіз.', EMAIL_INVALID: 'Жарамды email енгізіңіз.', SPAM: 'Пікіріңіз спамға ұқсайды. Қайта көріңіз.', RATE_LIMIT: 'Тым жылдам пікір жазудасыз. Сәл күтіңіз.', DUPLICATE: 'Сіз бұл пікірді бұрын жібергенсіз.', UNAUTHORIZED: 'Жарамсыз админ токені.' },
  },
};

const shareChannels = [
  { id: 'whatsapp', label: 'WhatsApp', color: '#25d366', kind: 'url', build: 'wa' },
  { id: 'facebook', label: 'Facebook', color: '#1877f2', kind: 'url', build: 'fb' },
  { id: 'x', label: 'X', color: '#000000', kind: 'url', build: 'x' },
  { id: 'telegram', label: 'Telegram', color: '#229ed9', kind: 'url', build: 'tg' },
  { id: 'instagram', label: 'Instagram', color: '#e1306c', kind: 'copy' },
  { id: 'tiktok', label: 'TikTok', color: '#010101', kind: 'copy' },
  { id: 'pinterest', label: 'Pinterest', color: '#e60023', kind: 'url', build: 'pin' },
  { id: 'youtube', label: 'YouTube', color: '#ff0000', kind: 'open', url: 'https://www.youtube.com/@daqigroup' },
  { id: 'line', label: 'Line', color: '#00c300', kind: 'url', build: 'line' },
  { id: 'kakaotalk', label: 'KakaoTalk', color: '#fee500', kind: 'url', build: 'kakao', darkText: true },
  { id: 'vk', label: 'VK', color: '#0077ff', kind: 'url', build: 'vk' },
  { id: 'ok', label: 'OK', color: '#ee8208', kind: 'url', build: 'ok' },
  { id: 'naver', label: 'Naver', color: '#03c75a', kind: 'url', build: 'naver' },
  { id: 'zalo', label: 'Zalo', color: '#0068ff', kind: 'copy' },
  { id: 'mixi', label: 'Mixi', color: '#f5a623', kind: 'copy' },
  { id: 'linkedin', label: 'LinkedIn', color: '#0a66c2', kind: 'url', build: 'li' },
  { id: 'reddit', label: 'Reddit', color: '#ff4500', kind: 'url', build: 'reddit' },
  { id: 'tumblr', label: 'Tumblr', color: '#34526f', kind: 'url', build: 'tumblr' },
  { id: 'snapchat', label: 'Snapchat', color: '#fffc00', kind: 'copy', darkText: true },
];

function buildShareUrl(kind, url, title, desc) {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  const d = encodeURIComponent(desc);
  switch (kind) {
    case 'wa': return `https://wa.me/?text=${t}%20${u}`;
    case 'fb': return `https://www.facebook.com/sharer/sharer.php?u=${u}`;
    case 'x': return `https://twitter.com/intent/tweet?url=${u}&text=${t}`;
    case 'tg': return `https://t.me/share/url?url=${u}&text=${t}`;
    case 'pin': return `https://pinterest.com/pin/create/button/?url=${u}&description=${d}`;
    case 'line': return `https://social-plugins.line.me/lineit/share?url=${u}&text=${t}`;
    case 'kakao': return `https://story.kakao.com/share?url=${u}`;
    case 'vk': return `https://vk.com/share.php?url=${u}&title=${t}`;
    case 'ok': return `https://connect.ok.ru/offer?url=${u}&title=${t}`;
    case 'naver': return `https://share.naver.com/web/shareView?url=${u}&title=${t}`;
    case 'li': return `https://www.linkedin.com/sharing/share-offsite/?url=${u}`;
    case 'reddit': return `https://www.reddit.com/submit?url=${u}&title=${t}`;
    case 'tumblr': return `https://www.tumblr.com/widgets/share/tool?canonicalUrl=${u}&posttype=link&title=${t}&caption=${d}`;
    default: return url;
  }
}

function setMeta(name, content) {
  let el = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(name.startsWith('og:') || name.startsWith('article:') ? 'property' : 'name', name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

export default {
  data() {
    return {
      post: null,
      lang: 'en',
      langs: langsMeta,
      comments: [],
      page: 1,
      pages: 1,
      total: 0,
      sort: 'newest',
      form: { author: '', email: '', content: '' },
      formMsg: '',
      formOk: false,
      submitting: false,
      showAdmin: false,
      adminToken: '',
      adminMsg: '',
      pendingList: [],
      replyTexts: {},
      templates: { en: [], es: [], zh: [], de: [], fr: [], pt: [], nl: [], pl: [], ru: [], ar: [], ja: [], ko: [], th: [], he: [], vi: [], id: [], kk: [] },
      tplLang: 'en',
      shareChannels,
      shareMsg: '',
      shareMsgTimer: null,
    };
  },
  async created() {
    this.loadPost();
    const res = await fetch('/api/blog/reply-templates');
    if (res.ok) {
      const data = await res.json();
      this.templates = data.templates || this.templates;
    }
  },
  watch: {
    '$route.params.slug'() {
      this.post = null;
      this.loadPost();
    },
  },
  methods: {
    t(key) {
      return (i18n[this.lang] && i18n[this.lang][key]) || key;
    },
    langText(code, key) {
      return (i18n[code] && i18n[code][key]) || key;
    },
    isRtl(code) {
      return code === 'ar' || code === 'he';
    },
    setSeo(post) {
      const base = window.location.origin;
      document.title = `${post.title} | DaqiAPI Blog`;
      setMeta('description', post.excerpt);
      setMeta('og:title', post.title);
      setMeta('og:description', post.excerpt);
      setMeta('og:type', 'article');
      setMeta('og:image', `${base}${post.cover}`);
      setMeta('og:url', window.location.href);
      setMeta('article:published_time', post.date);
      let ld = document.getElementById('seo-jsonld');
      if (!ld) {
        ld = document.createElement('script');
        ld.id = 'seo-jsonld';
        ld.type = 'application/ld+json';
        document.head.appendChild(ld);
      }
      ld.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: post.title,
        description: post.excerpt,
        image: `${base}${post.cover}`,
        datePublished: post.date,
        dateModified: post.date,
        author: { '@type': 'Organization', name: 'DaqiAPI' },
        publisher: { '@type': 'Organization', name: 'DaqiAPI' },
      });
      let bc = document.getElementById('seo-breadcrumb');
      if (!bc) {
        bc = document.createElement('script');
        bc.id = 'seo-breadcrumb';
        bc.type = 'application/ld+json';
        document.head.appendChild(bc);
      }
      bc.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: base },
          { '@type': 'ListItem', position: 2, name: 'Blog', item: `${base}/blog` },
          { '@type': 'ListItem', position: 3, name: post.title, item: window.location.href },
        ],
      });
      const faq = (post.content || []).filter((b) => b.faq).flatMap((b) => b.faq);
      let fq = document.getElementById('seo-faqpage');
      if (faq.length) {
        if (!fq) {
          fq = document.createElement('script');
          fq.id = 'seo-faqpage';
          fq.type = 'application/ld+json';
          document.head.appendChild(fq);
        }
        fq.textContent = JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faq.map((f) => ({
            '@type': 'Question',
            name: f.q,
            acceptedAnswer: { '@type': 'Answer', text: f.a },
          })),
        });
      }
    },
    tErr(code) {
      const e = (i18n[this.lang] && i18n[this.lang].errors) || {};
      return e[code] || code;
    },
    async loadPost() {
      const res = await fetch(`/api/blog/posts/${this.$route.params.slug}`);
      if (res.ok) {
        this.post = await res.json();
        this.setSeo(this.post);
      }
      await this.loadComments(1);
    },
    async loadComments(page) {
      const res = await fetch(`/api/blog/posts/${this.$route.params.slug}/comments?page=${page}&sort=${this.sort}`);
      if (res.ok) {
        const data = await res.json();
        this.comments = data.comments;
        this.page = data.page;
        this.pages = data.pages;
        this.total = data.total;
      }
    },
    toggleSort() {
      this.sort = this.sort === 'newest' ? 'oldest' : 'newest';
      this.loadComments(1);
    },
    async submitComment() {
      this.submitting = true;
      this.formMsg = '';
      try {
        const res = await fetch(`/api/blog/posts/${this.$route.params.slug}/comments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.form),
        });
        const data = await res.json();
        if (!res.ok) {
          this.formOk = false;
          this.formMsg = this.tErr(data.error);
          return;
        }
        this.formOk = true;
        this.formMsg = this.t('success');
        this.form = { author: '', email: '', content: '' };
        await this.loadComments(1);
      } catch (err) {
        this.formOk = false;
        this.formMsg = 'Network error';
      } finally {
        this.submitting = false;
      }
    },
    fmtDate(ts) {
      try {
        return new Date(ts).toLocaleDateString();
      } catch (err) {
        return '';
      }
    },
    share(ch) {
      const url = window.location.href;
      if (ch.kind === 'open') {
        window.open(ch.url, '_blank', 'noopener');
        return;
      }
      if (ch.kind === 'copy') {
        navigator.clipboard.writeText(url).then(() => {
          this.showShareMsg(this.t('shareCopied').replace('{platform}', ch.label));
        });
        return;
      }
      const desc = this.post ? this.post.excerpt : '';
      window.open(buildShareUrl(ch.build, url, this.post.title, desc), '_blank', 'noopener,width=600,height=550');
    },
    showShareMsg(msg) {
      this.shareMsg = msg;
      clearTimeout(this.shareMsgTimer);
      this.shareMsgTimer = setTimeout(() => (this.shareMsg = ''), 2500);
    },
    toggleAdmin() {
      this.showAdmin = !this.showAdmin;
    },
    async loadPending() {
      this.adminMsg = '';
      const res = await fetch('/api/blog/admin/comments', {
        headers: { 'x-admin-token': this.adminToken },
      });
      const data = await res.json();
      if (!res.ok) {
        this.adminMsg = this.tErr(data.error) || this.t('adminTokenMsg');
        return;
      }
      this.pendingList = data.pending || [];
    },
    async approve(id) {
      await fetch(`/api/blog/admin/comments/${id}/approve`, { method: 'POST', headers: { 'x-admin-token': this.adminToken } });
      this.loadPending();
      this.loadComments(this.page);
    },
    async del(id) {
      await fetch(`/api/blog/admin/comments/${id}/delete`, { method: 'POST', headers: { 'x-admin-token': this.adminToken } });
      this.loadPending();
      this.loadComments(this.page);
    },
    async reply(id) {
      const content = this.replyTexts[id];
      if (!content) return;
      const res = await fetch(`/api/blog/admin/comments/${id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': this.adminToken },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        this.replyTexts[id] = '';
        this.loadPending();
        this.loadComments(this.page);
      }
    },
    copyTemplate(text) {
      navigator.clipboard.writeText(text).then(() => {
        this.showShareMsg(this.t('tplCopied'));
      });
    },
  },
};
</script>
