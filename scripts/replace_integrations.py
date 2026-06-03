with open('C:/Users/lucag/Desktop/CLAUDE/APPS/APPS/Gestion C.A.R/pages/AdminPage.tsx', encoding='utf-8') as f:
    lines = f.readlines()

# Find line indices (1-based → 0-based)
start_line = 1679 - 1   # {activeTab === "integrations" && (
end_line   = 2081 - 1   # closing )}

new_block = '''                  {activeTab === "integrations" && (
                    <div className="space-y-4">

                      {/* 1. TIENDA ONLINE */}
                      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-3.5 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                              <ShoppingBag className="w-3.5 h-3.5 text-emerald-600" />
                            </div>
                            <div>
                              <p className="text-[13px] font-black text-zinc-900 dark:text-white">Tienda Online</p>
                              <p className="text-[10px] text-zinc-400">Shopify · Tiendanube · WooCommerce</p>
                            </div>
                          </div>
                          {editForm.ecommerce_platform && editForm.shopify_access_token ? (
                            statuses.shopify === "ok" ? <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400"><Check className="w-3.5 h-3.5" /> Conectado</span>
                            : statuses.shopify === "error" ? <span className="flex items-center gap-1.5 text-[11px] font-bold text-red-500"><X className="w-3.5 h-3.5" /> Error</span>
                            : <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">⚠ Sin verificar</span>
                          ) : <span className="text-[11px] text-zinc-400">No configurado</span>}
                        </div>
                        <div className="p-5 space-y-3">
                          <div className="grid grid-cols-3 gap-2">
                            {["shopify","tiendanube","wordpress"].map(p => (
                              <button key={p} type="button" onClick={() => ef("ecommerce_platform", editForm.ecommerce_platform === p ? "" : p)}
                                className={`h-9 rounded-xl text-[11px] font-black border transition-all ${editForm.ecommerce_platform === p ? "bg-emerald-600 text-white border-emerald-600" : "border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:border-zinc-400"}`}>
                                {p === "shopify" ? "Shopify" : p === "tiendanube" ? "Tiendanube" : "WooCommerce"}
                              </button>
                            ))}
                          </div>
                          {editForm.ecommerce_platform === "shopify" && (
                            <div className="space-y-3">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <Field label="Dominio Shopify (ej: tienda.myshopify.com)">
                                  <input type="text" value={editForm.shopify_domain} onChange={e => ef("shopify_domain", e.target.value)} placeholder="tienda.myshopify.com" className={inputCls} />
                                </Field>
                                <Field label="Admin Access Token (shpat_...)">
                                  <input type="password" value={editForm.shopify_access_token} onChange={e => ef("shopify_access_token", e.target.value)} placeholder="shpat_xxxxxxxxxx" className={inputCls} />
                                </Field>
                              </div>
                              <button type="button" onClick={testShopify} disabled={testingShopify || !editForm.shopify_domain || !editForm.shopify_access_token}
                                className={`w-full h-10 rounded-xl text-[12px] font-black flex items-center justify-center gap-2 transition-all disabled:opacity-40 ${statuses.shopify === "ok" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-zinc-900 dark:bg-white hover:bg-zinc-700 dark:hover:bg-zinc-100 text-white dark:text-zinc-900"}`}>
                                {testingShopify ? <Loader2 className="w-4 h-4 animate-spin" /> : statuses.shopify === "ok" ? <Check className="w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
                                {testingShopify ? "Verificando..." : statuses.shopify === "ok" ? "Conexión verificada ✓" : "Verificar Conexión Shopify"}
                              </button>
                            </div>
                          )}
                          {editForm.ecommerce_platform === "tiendanube" && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <Field label="Store ID"><input type="text" value={editForm.tiendanube_store_id} onChange={e => ef("tiendanube_store_id", e.target.value)} placeholder="1234567" className={inputCls} /></Field>
                              <Field label="Access Token"><input type="password" value={editForm.tiendanube_access_token} onChange={e => ef("tiendanube_access_token", e.target.value)} placeholder="token" className={inputCls} /></Field>
                            </div>
                          )}
                          {editForm.ecommerce_platform === "wordpress" && (
                            <div className="space-y-3">
                              <Field label="URL del sitio"><input type="text" value={editForm.wordpress_url} onChange={e => ef("wordpress_url", e.target.value)} placeholder="https://mitienda.com" className={inputCls} /></Field>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <Field label="Consumer Key (ck_...)"><input type="password" value={editForm.woo_consumer_key} onChange={e => ef("woo_consumer_key", e.target.value)} placeholder="ck_xxx" className={inputCls} /></Field>
                                <Field label="Consumer Secret (cs_...)"><input type="password" value={editForm.woo_consumer_secret} onChange={e => ef("woo_consumer_secret", e.target.value)} placeholder="cs_xxx" className={inputCls} /></Field>
                              </div>
                              <button type="button" onClick={testWoo} disabled={testingWoo || !editForm.wordpress_url}
                                className={`w-full h-10 rounded-xl text-[12px] font-black flex items-center justify-center gap-2 transition-all disabled:opacity-40 ${statuses.shopify === "ok" ? "bg-emerald-600 text-white" : "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"}`}>
                                {testingWoo ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                {testingWoo ? "Verificando..." : "Verificar WooCommerce"}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 2. META ADS */}
                      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-3.5 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
                              <Facebook className="w-3.5 h-3.5 text-blue-600" />
                            </div>
                            <div>
                              <p className="text-[13px] font-black text-zinc-900 dark:text-white">Meta Ads</p>
                              <p className="text-[10px] text-zinc-400">Cuenta publicitaria para captación</p>
                            </div>
                          </div>
                          {editForm.meta_account_id ? (
                            statuses.meta === "ok" ? <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400"><Check className="w-3.5 h-3.5" /> Conectado</span>
                            : statuses.meta === "error" ? <span className="flex items-center gap-1.5 text-[11px] font-bold text-red-500"><X className="w-3.5 h-3.5" /> Error</span>
                            : <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">⚠ Sin verificar</span>
                          ) : <span className="text-[11px] text-zinc-400">No configurado</span>}
                        </div>
                        <div className="p-5 space-y-3">
                          <Field label="Cuenta publicitaria">
                            <select value={editForm.meta_account_id} onChange={e => ef("meta_account_id", e.target.value)} className={inputCls}>
                              <option value="">Seleccionar cuenta...</option>
                              {metaAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name} ({acc.id})</option>)}
                            </select>
                          </Field>
                          <button type="button" onClick={testMeta} disabled={testingMeta || !editForm.meta_account_id}
                            className={`w-full h-10 rounded-xl text-[12px] font-black flex items-center justify-center gap-2 transition-all disabled:opacity-40 ${statuses.meta === "ok" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"}`}>
                            {testingMeta ? <Loader2 className="w-4 h-4 animate-spin" /> : statuses.meta === "ok" ? <Check className="w-4 h-4" /> : <Facebook className="w-4 h-4" />}
                            {testingMeta ? "Verificando..." : statuses.meta === "ok" ? "Meta Ads conectado ✓" : "Verificar Meta Ads"}
                          </button>
                        </div>
                      </div>

                      {/* 3. FACEBOOK & INSTAGRAM */}
                      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-3.5 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-pink-500/10 flex items-center justify-center">
                              <Instagram className="w-3.5 h-3.5 text-pink-500" />
                            </div>
                            <div>
                              <p className="text-[13px] font-black text-zinc-900 dark:text-white">Facebook & Instagram</p>
                              <p className="text-[10px] text-zinc-400">Comentarios, DMs y mensajería</p>
                            </div>
                          </div>
                          {editForm.fb_page_id ? (
                            (statuses.facebook === "ok" || statuses.instagram === "ok") ? <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400"><Check className="w-3.5 h-3.5" /> Conectado</span>
                            : (statuses.facebook === "error" || statuses.instagram === "error") ? <span className="flex items-center gap-1.5 text-[11px] font-bold text-red-500"><X className="w-3.5 h-3.5" /> Error</span>
                            : <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">⚠ Sin verificar</span>
                          ) : <span className="text-[11px] text-zinc-400">No configurado</span>}
                        </div>
                        <div className="p-5 space-y-3">
                          {editingClient && (editingClient as any).fb_page_access_token && (
                            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 text-[11px] text-emerald-700 dark:text-emerald-400 font-bold">
                              <Check className="w-3.5 h-3.5 shrink-0" />
                              Token activo · {(editingClient as any).fb_page_name || editingClient.fb_page_id}{(editingClient as any).ig_username ? ` · @${(editingClient as any).ig_username}` : ""}
                            </div>
                          )}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <Field label="Página de Facebook">
                              <div className="flex gap-1.5">
                                <select value={editForm.fb_page_id || ""} onChange={e => handleSelectFbPage(e.target.value)} className={`${inputCls} flex-1`} disabled={loadingFbPages}>
                                  <option value="">-- Seleccionar --</option>
                                  {discoveredFbPages.map(p => <option key={p.id} value={p.id}>{p.name} ({p.id})</option>)}
                                  {editForm.fb_page_id && !discoveredFbPages.some(p => p.id === editForm.fb_page_id) && (
                                    <option value={editForm.fb_page_id}>{editForm.fb_page_name || "Página actual"} ({editForm.fb_page_id})</option>
                                  )}
                                </select>
                                <button type="button" onClick={() => loadDiscoveredFbPages(false)} disabled={loadingFbPages} className="px-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 flex items-center justify-center transition-all">
                                  <RefreshCw className={`w-3.5 h-3.5 ${loadingFbPages ? "animate-spin" : ""}`} />
                                </button>
                              </div>
                            </Field>
                            <Field label="Cuenta de Instagram">
                              <div className="flex gap-1.5">
                                <select value={editForm.ig_business_id || ""} onChange={e => handleSelectIgAccount(e.target.value)} className={`${inputCls} flex-1`} disabled={loadingIgAccounts}>
                                  <option value="">-- Seleccionar --</option>
                                  {discoveredIgAccounts.map(a => <option key={a.igId} value={a.igId}>{a.name || a.username} (@{a.username})</option>)}
                                  {editForm.ig_business_id && !discoveredIgAccounts.some(a => a.igId === editForm.ig_business_id) && (
                                    <option value={editForm.ig_business_id}>{editForm.ig_username ? `@${editForm.ig_username}` : "Cuenta actual"}</option>
                                  )}
                                </select>
                                <button type="button" onClick={() => loadDiscoveredIgAccounts(false)} disabled={loadingIgAccounts} className="px-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 flex items-center justify-center transition-all">
                                  <RefreshCw className={`w-3.5 h-3.5 ${loadingIgAccounts ? "animate-spin" : ""}`} />
                                </button>
                              </div>
                            </Field>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <button type="button" onClick={testFacebookPage} disabled={testingFbPage || !editForm.fb_page_id}
                              className={`h-10 rounded-xl text-[11px] font-black flex items-center justify-center gap-2 transition-all disabled:opacity-40 ${statuses.facebook === "ok" ? "bg-emerald-600 text-white" : "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"}`}>
                              {testingFbPage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : statuses.facebook === "ok" ? <Check className="w-3.5 h-3.5" /> : <Facebook className="w-3.5 h-3.5" />}
                              {testingFbPage ? "Verificando..." : statuses.facebook === "ok" ? "Facebook OK" : "Verificar Facebook"}
                            </button>
                            <button type="button" onClick={testInstagram} disabled={testingIg || !editForm.ig_business_id}
                              className={`h-10 rounded-xl text-[11px] font-black flex items-center justify-center gap-2 transition-all disabled:opacity-40 ${statuses.instagram === "ok" ? "bg-emerald-600 text-white" : "bg-gradient-to-r from-pink-500 to-purple-600 text-white"}`}>
                              {testingIg ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : statuses.instagram === "ok" ? <Check className="w-3.5 h-3.5" /> : <Instagram className="w-3.5 h-3.5" />}
                              {testingIg ? "Verificando..." : statuses.instagram === "ok" ? "Instagram OK" : "Verificar Instagram"}
                            </button>
                          </div>
                          <details className="group">
                            <summary className="text-[10px] font-semibold text-zinc-400 cursor-pointer flex items-center gap-1 hover:text-zinc-600 dark:hover:text-zinc-200">
                              <ChevronRight className="w-3 h-3 transition-transform group-open:rotate-90" /> Campos manuales avanzados
                            </summary>
                            <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                              <Field label="Instagram ID"><input type="text" value={editForm.ig_business_id || ""} onChange={e => ef("ig_business_id", e.target.value)} placeholder="17841400000000000" className={inputCls} /></Field>
                              <Field label="Instagram Username"><input type="text" value={editForm.ig_username || ""} onChange={e => ef("ig_username", e.target.value.replace("@",""))} placeholder="mi_cuenta" className={inputCls} /></Field>
                              <Field label="Facebook Page ID"><input type="text" value={editForm.fb_page_id || ""} onChange={e => ef("fb_page_id", e.target.value)} placeholder="10000000000000" className={inputCls} /></Field>
                              <Field label="Facebook Page Name"><input type="text" value={editForm.fb_page_name || ""} onChange={e => ef("fb_page_name", e.target.value)} placeholder="Mi Página" className={inputCls} /></Field>
                              <Field label="Page Access Token"><input type="text" value={editForm.fb_page_access_token || ""} onChange={e => ef("fb_page_access_token", e.target.value)} placeholder="EAARv..." className={inputCls} /></Field>
                            </div>
                          </details>
                          {editingClient?.meta_account_id && (
                            <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800">
                              <button type="button" onClick={syncCatalog} disabled={syncingCatalog}
                                className="w-full h-9 rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[11px] font-bold hover:bg-emerald-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                                {syncingCatalog ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                                {syncingCatalog ? "Sincronizando..." : (editingClient as any).catalog_synced_at ? `Re-sincronizar catálogo (${new Date((editingClient as any).catalog_synced_at).toLocaleDateString("es-AR")})` : "Sincronizar catálogo desde Meta"}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 4. KLAVIYO */}
                      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-3.5 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                              <Mail className="w-3.5 h-3.5 text-yellow-600" />
                            </div>
                            <div>
                              <p className="text-[13px] font-black text-zinc-900 dark:text-white">Klaviyo</p>
                              <p className="text-[10px] text-zinc-400">Email marketing y automatizaciones · opcional</p>
                            </div>
                          </div>
                          {editForm.klaviyo_api_key ? (
                            statuses.klaviyo === "ok" ? <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400"><Check className="w-3.5 h-3.5" /> Conectado</span>
                            : statuses.klaviyo === "error" ? <span className="flex items-center gap-1.5 text-[11px] font-bold text-red-500"><X className="w-3.5 h-3.5" /> Error</span>
                            : <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">⚠ Sin verificar</span>
                          ) : <span className="text-[11px] text-zinc-400">No configurado · opcional</span>}
                        </div>
                        <div className="p-5 space-y-3">
                          <Field label="Klaviyo Private API Key (pk_...)">
                            <input type="password" value={editForm.klaviyo_api_key} onChange={e => ef("klaviyo_api_key", e.target.value)} placeholder="pk_xxxxxxxxxxxxxxxxxxxx" className={inputCls} />
                          </Field>
                          <button type="button" onClick={testKlaviyo} disabled={testingKlaviyo || !editForm.klaviyo_api_key}
                            className={`w-full h-10 rounded-xl text-[12px] font-black flex items-center justify-center gap-2 transition-all disabled:opacity-40 ${statuses.klaviyo === "ok" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-yellow-500 hover:bg-yellow-600 text-white"}`}>
                            {testingKlaviyo ? <Loader2 className="w-4 h-4 animate-spin" /> : statuses.klaviyo === "ok" ? <Check className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                            {testingKlaviyo ? "Verificando..." : statuses.klaviyo === "ok" ? "Klaviyo conectado ✓" : "Verificar Klaviyo"}
                          </button>
                        </div>
                      </div>

                      {/* 5. CHATWOOT */}
                      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-3.5 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-violet-500/10 flex items-center justify-center">
                              <MessageSquare className="w-3.5 h-3.5 text-violet-500" />
                            </div>
                            <div>
                              <p className="text-[13px] font-black text-zinc-900 dark:text-white">Chatwoot</p>
                              <p className="text-[10px] text-zinc-400">Sistema de mensajería y soporte · opcional</p>
                            </div>
                          </div>
                          {editForm.chatwoot_url && editForm.chatwoot_token ? (
                            statuses.chatwoot === "ok" ? <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400"><Check className="w-3.5 h-3.5" /> Conectado</span>
                            : statuses.chatwoot === "error" ? <span className="flex items-center gap-1.5 text-[11px] font-bold text-red-500"><X className="w-3.5 h-3.5" /> Error</span>
                            : <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">⚠ Sin verificar</span>
                          ) : <span className="text-[11px] text-zinc-400">No configurado · opcional</span>}
                        </div>
                        <div className="p-5 space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <Field label="URL Chatwoot (ej: https://chat.tuempresa.com)">
                              <input type="text" value={editForm.chatwoot_url} onChange={e => ef("chatwoot_url", e.target.value)} placeholder="https://chatwoot.com" className={inputCls} />
                            </Field>
                            <Field label="User Access Token">
                              <input type="password" value={editForm.chatwoot_token} onChange={e => ef("chatwoot_token", e.target.value)} placeholder="Token de acceso personal" className={inputCls} />
                            </Field>
                          </div>
                          <button type="button" onClick={testChatwoot} disabled={testingChatwoot || !editForm.chatwoot_url || !editForm.chatwoot_token}
                            className={`w-full h-10 rounded-xl text-[12px] font-black flex items-center justify-center gap-2 transition-all disabled:opacity-40 ${statuses.chatwoot === "ok" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-violet-600 hover:bg-violet-700 text-white"}`}>
                            {testingChatwoot ? <Loader2 className="w-4 h-4 animate-spin" /> : statuses.chatwoot === "ok" ? <Check className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
                            {testingChatwoot ? "Verificando..." : statuses.chatwoot === "ok" ? "Chatwoot conectado ✓" : "Verificar Chatwoot"}
                          </button>
                        </div>
                      </div>

                      {/* SAVE BUTTON */}
                      {(() => {
                        const needsVerify = [
                          editForm.shopify_access_token && statuses.shopify !== "ok" && "Shopify",
                          editForm.meta_account_id && statuses.meta !== "ok" && "Meta Ads",
                          editForm.fb_page_id && statuses.facebook !== "ok" && "Facebook",
                          editForm.klaviyo_api_key && statuses.klaviyo !== "ok" && "Klaviyo",
                          (editForm.chatwoot_url && editForm.chatwoot_token) && statuses.chatwoot !== "ok" && "Chatwoot",
                        ].filter(Boolean) as string[];
                        return (
                          <div className="pt-2">
                            {needsVerify.length > 0 && (
                              <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 mb-3">
                                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                <p className="text-[11px] text-amber-700 dark:text-amber-400 font-bold">
                                  Verificá antes de guardar: {needsVerify.join(", ")}
                                </p>
                              </div>
                            )}
                            <button type="button" onClick={saveConfig as any} disabled={savingConfig || needsVerify.length > 0}
                              className="w-full h-11 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[13px] font-black flex items-center justify-center gap-2 transition-all shadow-md shadow-violet-500/20">
                              {savingConfig ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                              {savingConfig ? "Guardando..." : needsVerify.length > 0 ? `Verificá ${needsVerify.length} conexión${needsVerify.length > 1 ? "es" : ""} primero` : "Guardar Conexiones"}
                            </button>
                          </div>
                        );
                      })()}
                    </div>
                  )}
'''

new_lines = new_block.splitlines(keepends=True)
lines[start_line:end_line+1] = new_lines
with open('C:/Users/lucag/Desktop/CLAUDE/APPS/APPS/Gestion C.A.R/pages/AdminPage.tsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)
print('Done')
