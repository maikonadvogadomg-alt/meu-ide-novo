import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { fetch } from "expo/fetch";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { useApiBase } from "@/hooks/useApiBase";
import type { AIProvider } from "@/context/AppContext";
import MessageRenderer from "@/components/MessageRenderer";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

function generateId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

// Auto-detect table: [prefix, baseUrl, defaultModel, displayName]
const AUTO_DETECT: [string, string, string, string][] = [
  ["gsk_",   "https://api.groq.com/openai/v1",                           "llama-3.3-70b-versatile",  "Groq"],
  ["sk-or-", "https://openrouter.ai/api/v1",                             "openai/gpt-4o-mini",       "OpenRouter"],
  ["pplx-",  "https://api.perplexity.ai",                                "sonar-pro",                "Perplexity"],
  ["AIza",   "https://generativelanguage.googleapis.com/v1beta/openai/", "gemini-2.0-flash",         "Google Gemini"],
  ["xai-",   "https://api.x.ai/v1",                                      "grok-2-latest",            "xAI / Grok"],
  ["sk-ant", "https://api.anthropic.com/v1",                             "claude-haiku-4-20250514",  "Anthropic"],
  ["sk-",    "https://api.openai.com/v1",                                "gpt-4o-mini",              "OpenAI"],
];

function autoDetect(key: string): { url: string; model: string; name: string } | null {
  const k = (key || "").trim();
  for (const [prefix, url, model, name] of AUTO_DETECT) {
    if (k.startsWith(prefix)) return { url, model, name };
  }
  return null;
}

function getEndpoint(provider: AIProvider, apiBase?: string): { url: string; headers: Record<string, string> } {
  // Cortesia Gemini â proxy via servidor (sem chave necessÃ¡ria)
  if (provider.type === "cortesia") {
    const base = apiBase || "http://localhost:8080";
    return {
      url: `${base}/api/ai/chat`,
      headers: { "Content-Type": "application/json" },
    };
  }
  // Anthropic uses its own protocol
  if (provider.type === "anthropic") {
    return {
      url: (provider.baseUrl || "https://api.anthropic.com") + "/v1/messages",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": provider.apiKey,
        "anthropic-version": "2023-06-01",
      },
    };
  }
  // All other providers (OpenAI, Groq, OpenRouter, Perplexity, Gemini OpenAI-compat, xAI, DeepSeek, Mistral, custom)
  // use the OpenAI-compatible /chat/completions format
  const detected = autoDetect(provider.apiKey);
  let base = provider.baseUrl?.replace(/\/$/, "");
  if (!base) {
    base = detected?.url?.replace(/\/$/, "") || "https://api.openai.com/v1";
  }
  const url = base.endsWith("/chat/completions") ? base : base + "/chat/completions";
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${provider.apiKey}`,
  };
  if (provider.type === "openrouter") {
    headers["HTTP-Referer"] = "https://devmobile.app";
    headers["X-Title"] = "DevMobile IDE";
  }
  return { url, headers };
}

// Chama Google Gemini diretamente do celular (sem servidor externo)
async function callGeminiDirect(
  apiKey: string,
  messages: Message[],
  systemPrompt: string | undefined,
  model: string,
  onChunk: (chunk: string) => void
): Promise<void> {
  const url = `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`;
  const chatMsgs = messages
    .filter(m => m.role === "user" || m.role === "assistant")
    .map(m => ({ role: m.role as "user" | "assistant", content: m.content }));
  if (systemPrompt) {
    chatMsgs.unshift({ role: "user" as const, content: `[CONTEXTO DO SISTEMA]: ${systemPrompt}` });
  }
  const body = JSON.stringify({ model, stream: true, max_tokens: 16384, messages: chatMsgs });
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body,
  });
  if (!resp.ok) throw new Error(`Gemini direto erro ${resp.status}`);
  const reader = resp.body?.getReader();
  if (!reader) { const t = await resp.text(); onChunk(t); return; }
  const dec = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n"); buf = lines.pop() || "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const j = line.slice(6).trim();
      if (j === "[DONE]") return;
      try { const p = JSON.parse(j); if (p.choices?.[0]?.delta?.content) onChunk(p.choices[0].delta.content); } catch {}
    }
  }
}

async function callAI(
  provider: AIProvider,
  messages: Message[],
  onChunk: (chunk: string) => void,
  apiBase?: string,
  directKey?: string
): Promise<void> {
  const { url, headers } = getEndpoint(provider, apiBase);

  // ââ Cortesia Gemini ââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  if (provider.type === "cortesia") {
    const systemMsg = messages.find(m => m.id === "system");
    const chatMsgs = messages.filter(m => m.id !== "system");
    const model = provider.model || "gemini-2.5-flash";

    // PRIORIDADE 1: chave direta configurada â vai direto no Google, sem servidor
    if (directKey?.trim()) {
      return callGeminiDirect(directKey.trim(), chatMsgs, systemMsg?.content, model, onChunk);
    }

    // PRIORIDADE 2: servidor externo (proxy gratuito)
    const parseSSELine = (line: string) => {
      if (!line.startsWith("data: ")) return;
      const j = line.slice(6).trim();
      try {
        const parsed = JSON.parse(j);
        if (parsed.error) throw new Error(parsed.error);
        if (parsed.content) onChunk(parsed.content);
      } catch (e) {
        if (!(e instanceof SyntaxError)) throw e;
      }
    };

    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 10000);
      const body = JSON.stringify({
        messages: chatMsgs.map((m) => ({ role: m.role, content: m.content })),
        systemPrompt: systemMsg?.content,
        model,
      });
      const response = await fetch(url, { method: "POST", headers, body, signal: ctrl.signal });
      clearTimeout(t);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const useFullText = Platform.OS === "web" || !response.body;
      if (useFullText) {
        const text = await response.text();
        for (const line of text.split("\n")) parseSSELine(line);
        return;
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const j = line.slice(6).trim();
          try {
            const parsed = JSON.parse(j);
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.done) return;
            if (parsed.content) onChunk(parsed.content);
          } catch (e) {
            if (!(e instanceof SyntaxError)) throw e;
          }
        }
      }
      return;
    } catch {
      throw new Error("Gemini indisponÃ­vel. Adicione sua chave gratuita em ConfiguraÃ§Ãµes â GEMINI DIRETO.");
    }
  }

  // ââ Demais provedores ââââââââââââââââââââââââââââââââââââââââââââââââââââ
  const model = provider.model || getDefaultModel(provider.type);
  let body: string;
  const isAnthropicNative = provider.type === "anthropic";

  if (isAnthropicNative) {
    const systemMsg = messages.find(m => m.id === "system");
    const chatMsgs = messages.filter(m => m.id !== "system");
    body = JSON.stringify({
      model,
      max_tokens: 16384,
      stream: true,
      system: systemMsg?.content,
      messages: chatMsgs.map((m) => ({ role: m.role, content: m.content })),
    });
  } else {
    body = JSON.stringify({
      model,
      stream: true,
      max_tokens: 16384,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });
  }

  const response = await fetch(url, { method: "POST", headers, body });

  if (!response.ok) {
    const err = await response.text();
    let msg = `Erro ${response.status}`;
    try { const j = JSON.parse(err); msg = j.error?.message || j.error || j.message || msg; } catch {}
    throw new Error(msg);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("Sem stream disponÃ­vel");
  const decoder = new TextDecoder();
  let buf = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() || "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const j = line.slice(6).trim();
      if (j === "[DONE]") continue;
      try {
        const parsed = JSON.parse(j);
        if (parsed.error) throw new Error(parsed.error?.message || parsed.error);
        const text = isAnthropicNative
          ? (parsed.delta?.text || "")
          : (parsed.choices?.[0]?.delta?.content || "");
        if (text) onChunk(text);
      } catch (e) {
        if (e instanceof SyntaxError) continue;
        throw e;
      }
    }
  }
}

function getDefaultModel(type: AIProvider["type"]): string {
  switch (type) {
    case "openai":     return "gpt-4o-mini";
    case "anthropic":  return "claude-haiku-4-20250514";
    case "gemini":     return "gemini-2.0-flash";
    case "groq":       return "llama-3.3-70b-versatile";
    case "openrouter": return "openai/gpt-4o-mini";
    case "perplexity": return "sonar-pro";
    case "xai":        return "grok-2-latest";
    case "deepseek":   return "deepseek-chat";
    case "mistral":    return "mistral-small";
    default:           return "gpt-4o-mini";
  }
}

const AI_KEY_PROVIDERS: { type: AIProvider["type"]; label: string; hint: string }[] = [
  { type: "groq",       label: "Groq",       hint: "gsk_..." },
  { type: "openai",     label: "OpenAI",     hint: "sk-..." },
  { type: "anthropic",  label: "Claude",     hint: "sk-ant-..." },
  { type: "gemini",     label: "Gemini",     hint: "AIza..." },
  { type: "xai",        label: "xAI / Grok", hint: "xai-..." },
  { type: "openrouter", label: "OpenRouter", hint: "sk-or-..." },
  { type: "perplexity", label: "Perplexity", hint: "pplx-..." },
  { type: "deepseek",   label: "DeepSeek",   hint: "sk-..." },
];

function detectType(key: string): AIProvider["type"] {
  const d = autoDetect(key);
  if (!d) return "openai";
  if (d.name === "Groq")          return "groq";
  if (d.name === "OpenRouter")    return "openrouter";
  if (d.name === "Perplexity")    return "perplexity";
  if (d.name === "Google Gemini") return "gemini";
  if (d.name === "xAI / Grok")   return "xai";
  if (d.name === "Anthropic")     return "anthropic";
  return "openai";
}

// âââ Chips de aÃ§Ã£o rÃ¡pida (tela vazia) âââââââââââââââââââââââââââââââââââââââ
const SUGGESTION_CHIPS = [
  { label: "ð¦ Instalar biblioteca",  msg: "Quero instalar uma biblioteca npm no meu projeto. Me ajude a escolher e instalar." },
  { label: "ð Criar plano",          msg: "Crie um plano de desenvolvimento passo a passo para o projeto atual." },
  { label: "ð Debugar erro",         msg: "Tenho um erro no cÃ³digo. Me ajude a identificar e corrigir o problema." },
  { label: "â¡ Executar projeto",     msg: "Como executo/testo este projeto? Qual o comando correto?" },
  { label: "ð Criar arquivo",        msg: "Preciso criar um novo arquivo no projeto. Me guie no processo." },
  { label: "ð Revisar cÃ³digo",       msg: "Revise o cÃ³digo do arquivo atual e sugira melhorias de qualidade e performance." },
  { label: "ð Adicionar .gitignore", msg: "Crie um .gitignore completo para este projeto." },
  { label: "ð Gerar README",         msg: "Gere um README.md profissional para este projeto." },
];

// Chips de resposta rÃ¡pida pÃ³s-mensagem IA
const QUICK_REPLIES = [
  { label: "â OK, pode fazer",     msg: "OK, pode fazer." },
  { label: "â NÃ£o",               msg: "NÃ£o, obrigado." },
  { label: "â¶ Continue",           msg: "Continue com o prÃ³ximo passo." },
  { label: "ð Tente de novo",     msg: "Tente de outro jeito." },
  { label: "â Explica melhor",    msg: "Pode explicar com mais detalhes?" },
];

type ChatMode = "dev" | "livre" | "juridico";

const CHAT_MODES: { key: ChatMode; label: string; icon: string; color: string; prompt: string }[] = [
  {
    key: "dev",
    label: "Dev",
    icon: "code",
    color: "#00d4aa",
    prompt: "",
  },
  {
    key: "livre",
    label: "Campo Livre",
    icon: "message-circle",
    color: "#6366f1",
    prompt: "VocÃª Ã© uma IA de conversaÃ§Ã£o livre, sem restriÃ§Ãµes temÃ¡ticas. Responda com naturalidade, clareza e sem julgamentos. O usuÃ¡rio pode perguntar qualquer coisa.",
  },
  {
    key: "juridico",
    label: "JurÃ­dico",
    icon: "book",
    color: "#f59e0b",
    prompt: "VocÃª Ã© um assistente jurÃ­dico especializado em direito brasileiro. ForneÃ§a informaÃ§Ãµes legais claras, cite artigos de lei relevantes, e sempre recomende consultar um advogado para casos especÃ­ficos. Responda em portuguÃªs do Brasil.",
  },
];

interface AIChatProps {
  pendingMessage?: string;
  onPendingMessageConsumed?: () => void;
}

export default function AIChat({ pendingMessage, onPendingMessageConsumed }: AIChatProps = {}) {
  const colors = useColors();
  const apiBase = useApiBase();
  const { getActiveAIProvider, activeFile, activeProject, addAIProvider, aiMemory, settings, addMemoryEntry } = useApp();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [quickKey, setQuickKey] = useState("");
  const [showQuickKey, setShowQuickKey] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [chatMode, setChatMode] = useState<ChatMode>("dev");
  const listRef = useRef<FlatList>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (pendingMessage && pendingMessage.trim()) {
      setInput(pendingMessage);
      onPendingMessageConsumed?.();
    }
  }, [pendingMessage]);

  useEffect(() => {
    if (chatMode === "juridico") {
      AsyncStorage.getItem("chat_juridico").then(saved => {
        if (saved) {
          try { setMessages(JSON.parse(saved)); } catch {}
        }
      });
    }
  }, [chatMode]);

  useEffect(() => {
    if (chatMode === "juridico" && messages.length > 0) {
      AsyncStorage.setItem("chat_juridico", JSON.stringify(messages));
    }
  }, [messages, chatMode]);

  const handleSaveQuickKey = () => {
    const k = quickKey.trim();
    if (!k) return;
    const det = autoDetect(k);
    const type = detectType(k);
    addAIProvider({
      name: det?.name || AI_KEY_PROVIDERS.find(p => p.type === type)?.label || "OpenAI",
      type,
      apiKey: k,
      baseUrl: det?.url,
      model: det?.model,
      isActive: true,
    });
    setQuickKey("");
    setShowQuickKey(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const stopGeneration = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsLoading(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const sendMessage = useCallback(async (overrideText?: string) => {
    const provider = getActiveAIProvider();
    const text = (overrideText ?? input).trim();
    if (!text || isLoading) return;

    setShowQuickReplies(false);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userMsg: Message = { id: generateId(), role: "user", content: text };
    const assistantId = generateId();
    const assistantMsg: Message = { id: assistantId, role: "assistant", content: "" };

    if (!overrideText) setInput("");
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setIsLoading(true);

    if (!provider) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content:
                  "Nenhum provedor de IA configurado. VÃ¡ em Configuracoes > IA e adicione uma chave de API.",
              }
            : m
        )
      );
      setIsLoading(false);
      return;
    }

    const modeConfig = CHAT_MODES.find((m) => m.key === chatMode)!;

    let systemContext: string;

    if (chatMode !== "dev") {
      systemContext = modeConfig.prompt;
    } else {
      systemContext = settings.systemPrompt?.trim()
        ? settings.systemPrompt
        : `VocÃª Ã© um assistente de desenvolvimento profissional integrado ao DevMobile â um IDE no celular Android.

REGRAS DE COMPORTAMENTO (SEMPRE siga, sem exceÃ§Ã£o):

1. FEEDBACK CONSTANTE: ApÃ³s cada aÃ§Ã£o confirmada pelo usuÃ¡rio, informe SEMPRE o que foi feito + o prÃ³ximo passo sugerido. Nunca pare sem dar um prÃ³ximo passo.
   Exemplo: "â Biblioteca instalada. PrÃ³ximo: vou configurar o import no arquivo principal. Posso fazer isso?"

2. CONFIRMAÃÃES SIMPLES: Quando precisar de aprovaÃ§Ã£o, termine com uma pergunta direta de Sim/NÃ£o. O usuÃ¡rio sÃ³ precisa dizer "OK" ou "NÃ£o".
   Exemplo: "Encontrei o problema. Posso corrigir as linhas 12-15? (OK / NÃ£o)"

3. AÃÃES CONCRETAS: Quando sugerir instalar uma biblioteca, mostrar o comando exato:
   \`npm install nome-da-biblioteca\`
   Depois de confirmado, mostre o prÃ³ximo passo automaticamente.

4. NUNCA PARE NO MEIO: Se o usuÃ¡rio disser "OK", "sim", "pode", "faz", "vai", "continue" â execute a aÃ§Ã£o e jÃ¡ informe o resultado + prÃ³ximo passo.

5. CONTEXTO DO PROJETO: VocÃª tem acesso ao arquivo e projeto atual. Use esse contexto para dar respostas especÃ­ficas, nÃ£o genÃ©ricas.

6. FORMATO DAS RESPOSTAS:
   - Use â para aÃ§Ãµes concluÃ­das
   - Use ð para planos/passos
   - Use â ï¸ para avisos
   - Use ð¡ para sugestÃµes
   - Use blocos de cÃ³digo para comandos e cÃ³digo
   - Seja conciso mas completo â sem enrolar

7. INSTALAÃÃO DE BIBLIOTECAS: Sempre use npm (padrÃ£o). Mostre o comando, explique para que serve, e apÃ³s confirmaÃ§Ã£o mostre como usar no cÃ³digo.

8. PLANO DE EXECUÃÃO: Para tarefas grandes, liste os passos numerados e peÃ§a confirmaÃ§Ã£o para comeÃ§ar. Depois execute passo a passo dando feedback de cada um.`;

      if (activeFile) {
        systemContext += `\n\nð ARQUIVO ATUAL: ${activeFile.name} (${activeFile.language})\n\`\`\`${activeFile.language}\n${activeFile.content}\n\`\`\``;
      }
      if (activeProject) {
        systemContext += `\n\nð PROJETO: ${activeProject.name} (${activeProject.files.length} arquivo${activeProject.files.length !== 1 ? "s" : ""})`;
        const outrosArquivos = activeProject.files.filter(f => f.id !== activeFile?.id);
        if (outrosArquivos.length > 0) {
          let blocos = "";
          for (const f of outrosArquivos) {
            blocos += `\n\n--- ${f.path || f.name} ---\n${f.content || ""}`;
          }
          systemContext += `\n\nTODOS OS ARQUIVOS DO PROJETO (acesso completo a todos os ${outrosArquivos.length} arquivos):${blocos}`;
        }
      }
    }

    if (aiMemory.length > 0) {
      const memStr = aiMemory.map((e) => `- [${e.category}] ${e.content}`).join("\n");
      systemContext += `\n\nð§  MEMÃRIA DO USUÃRIO (use como contexto, nÃ£o mencione explicitamente):\n${memStr}`;
    }

    const allMessages: Message[] = [
      { id: "system", role: "user", content: systemContext },
      ...messages,
      userMsg,
    ];

    try {
      await callAI(provider, allMessages, (chunk) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: m.content + chunk } : m
          )
        );
      }, apiBase, settings.geminiDirectKey);
      // Auto-memÃ³ria: registra contexto do que foi feito
      if (activeProject || activeFile) {
        const memEntry = [
          activeProject ? `Projeto: ${activeProject.name} (${activeProject.files.length} arqs)` : "",
          activeFile ? `Arquivo: ${activeFile.name}` : "",
          `Pergunta: ${text.slice(0, 120)}`,
        ].filter(Boolean).join(" | ");
        addMemoryEntry({ content: memEntry, category: "projeto" });
      }
      // Mostra resposta rÃ¡pida apÃ³s IA responder com sucesso
      setShowQuickReplies(true);
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") {
        // GeraÃ§Ã£o parada pelo usuÃ¡rio â nÃ£o mostra erro
        setShowQuickReplies(true);
      } else {
        const errMsg = e instanceof Error ? e.message : "Erro desconhecido";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: `â ï¸ ${errMsg}\n\nVerifique sua chave de API e tente novamente.` } : m
          )
        );
      }
    } finally {
      setIsLoading(false);
      abortRef.current = null;
      listRef.current?.scrollToEnd({ animated: true });
    }
  }, [input, isLoading, messages, getActiveAIProvider, activeFile, activeProject, addMemoryEntry]);

  const sendQuickReply = (msg: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowQuickReplies(false);
    sendMessage(msg);
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === "user";
    return (
      <View
        style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.aiBubble,
          {
            backgroundColor: isUser ? colors.primary : colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        {!isUser && (
          <View style={styles.aiLabel}>
            <Feather name="cpu" size={10} color={colors.accent} />
            <Text style={[styles.aiLabelText, { color: colors.accent }]}>IA</Text>
          </View>
        )}
        <MessageRenderer
          content={item.content || (isLoading && item.role === "assistant" ? "Pensando..." : "")}
          isUser={isUser}
          showApply={!isUser}
        />
      </View>
    );
  };

  const provider = getActiveAIProvider();

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
    >
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Feather name="cpu" size={14} color={colors.primary} />
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Assistente IA</Text>
        {provider ? (
          <View style={[styles.providerBadge, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.providerText, { color: colors.mutedForeground }]}>
              {provider.name}
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => setShowQuickKey(v => !v)}
            style={[styles.providerBadge, { backgroundColor: colors.warning + "22", borderColor: colors.warning, borderWidth: 1 }]}
          >
            <Feather name="key" size={11} color={colors.warning} />
            <Text style={[styles.providerText, { color: colors.warning, fontWeight: "700" }]}>
              Adicionar Chave
            </Text>
          </TouchableOpacity>
        )}
        {messages.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              setMessages([]);
              setShowQuickReplies(false);
              if (chatMode === "juridico") AsyncStorage.removeItem("chat_juridico");
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            }}
            style={[styles.resetBtn, { backgroundColor: colors.secondary }]}
          >
            <Feather name="trash-2" size={14} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>

      {/* Banner: servidor desligado + provedor cortesia = aviso */}
      {provider?.type === "cortesia" && !apiBase && (
        <View style={{ backgroundColor: "#1a1000", borderBottomWidth: 1, borderBottomColor: "#ca8a0444", padding: 12, gap: 6 }}>
          <Text style={{ color: "#fbbf24", fontWeight: "700", fontSize: 13 }}>
            â ï¸ Servidor desligado â Cortesia nÃ£o disponÃ­vel
          </Text>
          <Text style={{ color: "#fde68a", fontSize: 12, lineHeight: 16 }}>
            A IA Cortesia Gemini precisa do servidor. Ligue o servidor nas ConfiguraÃ§Ãµes, ou troque para uma chave direta (Groq grÃ¡tis, Gemini, OpenAI, etc).
          </Text>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
            <TouchableOpacity
              onPress={() => setShowQuickKey(true)}
              style={{ flex: 1, backgroundColor: "#fbbf2422", borderRadius: 8, padding: 8, alignItems: "center", borderWidth: 1, borderColor: "#fbbf2444" }}
            >
              <Text style={{ color: "#fbbf24", fontWeight: "700", fontSize: 12 }}>+ Adicionar chave direta</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Modo de chat */}
      <View style={[styles.modeBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {CHAT_MODES.map((m) => {
          const active = chatMode === m.key;
          return (
            <TouchableOpacity
              key={m.key}
              onPress={() => {
                setChatMode(m.key);
                setMessages([]);
                setShowQuickReplies(false);
                Haptics.selectionAsync();
              }}
              style={[
                styles.modeBtn,
                { backgroundColor: active ? m.color + "22" : "transparent", borderColor: active ? m.color : "transparent" },
              ]}
            >
              <Feather name={m.icon as any} size={12} color={active ? m.color : colors.mutedForeground} />
              <Text style={{ fontSize: 11, fontWeight: active ? "700" : "400", color: active ? m.color : colors.mutedForeground, marginLeft: 4 }}>
                {m.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Atalhos de geraÃ§Ã£o (modo Dev) â ACIMA das mensagens */}
      {chatMode === "dev" && activeProject && !isLoading && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 10, paddingVertical: 6, gap: 6 }}
          style={[{ borderBottomWidth: 1, borderBottomColor: colors.border }]}
        >
          {[
            { label: "ð Gerar SPEC Completo", msg: `Gere uma ESPECIFICAÃÃO COMPLETA do projeto "${activeProject.name}" (arquivos: ${activeProject.files.map(f => f.name).join(", ") || "nenhum"}). Inclua: 1) O que o app faz (propÃ³sito e funcionalidades principais), 2) Rotas de API (se houver) com mÃ©todo, caminho e o que retorna, 3) FunÃ§Ãµes principais â nome, o que faz, limitaÃ§Ãµes, 4) O que funciona e o que nÃ£o funciona ainda, 5) Como o terminal funciona (comandos, limitaÃ§Ãµes, timeout), 6) Limites do sistema (tamanho, memÃ³ria, dependÃªncias), 7) Ãndice de documentaÃ§Ã£o (cada arquivo e sua funÃ§Ã£o), 8) PrÃ³ximos passos recomendados. Seja tÃ©cnico, objetivo e use markdown com tÃ­tulos e tabelas.` },
            { label: "ð Gerar PLANO.md", msg: `Analise o projeto "${activeProject.name}" (arquivos: ${activeProject.files.map(f => f.name).join(", ") || "nenhum"}) e gere um PLANO.md completo com: objetivo, stack tecnolÃ³gico, estrutura de pastas, funcionalidades implementadas, prÃ³ximos passos e arquitetura. Use markdown.` },
            { label: "âï¸ Gerar SISTEMA.md", msg: `Documente o projeto "${activeProject.name}" em um SISTEMA.md tÃ©cnico com: descriÃ§Ã£o do sistema, variÃ¡veis de ambiente, endpoints da API (se houver), dependÃªncias, instruÃ§Ãµes de build/run, e notas de arquitetura. Use markdown.` },
            { label: "ð Revisar cÃ³digo", msg: `Revise todos os arquivos do projeto "${activeProject.name}" e liste: bugs encontrados, melhorias de performance, boas prÃ¡ticas nÃ£o seguidas, e sugestÃµes de refatoraÃ§Ã£o. Seja objetivo e direto.` },
            { label: "ð¦ Listar deps", msg: `Quais bibliotecas/pacotes devo instalar para o projeto "${activeProject.name}"? Liste com: nome do pacote, versÃ£o recomendada, motivo de usar, e o comando npm install.` },
            { label: "ð Rotas de API", msg: `Liste todas as rotas de API do projeto "${activeProject.name}". Para cada rota: mÃ©todo HTTP (GET/POST/PUT/DELETE), caminho completo, o que ela recebe (body/params), o que ela retorna, se funciona ou nÃ£o, e o cÃ³digo de status esperado. Formato de tabela markdown.` },
          ].map((item) => (
            <TouchableOpacity
              key={item.label}
              onPress={() => sendMessage(item.msg)}
              style={[styles.quickReplyChip, { backgroundColor: colors.card, borderColor: colors.primary + "44" }]}
            >
              <Text style={[styles.quickReplyText, { color: colors.primary }]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Painel rÃ¡pido de chave */}
      {showQuickKey && !provider && (
        <View style={[styles.quickKeyPanel, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          {/* Cortesia Gemini â sem chave */}
          <TouchableOpacity
            onPress={() => {
              addAIProvider({
                name: "Cortesia Gemini",
                type: "cortesia",
                apiKey: "",
                isActive: true,
              });
              setShowQuickKey(false);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }}
            style={[styles.cortesiaBtn, { backgroundColor: colors.primary + "18", borderColor: colors.primary }]}
          >
            <Text style={{ fontSize: 18 }}>â¨</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 14 }}>Usar Cortesia Gemini</Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>GrÃ¡tis Â· sem chave Â· powered by Gemini 2.0 Flash</Text>
            </View>
            <Feather name="chevron-right" size={16} color={colors.primary} />
          </TouchableOpacity>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginVertical: 8 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
            <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>ou use sua prÃ³pria chave</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
          </View>
          <Text style={[styles.quickKeyTitle, { color: colors.foreground }]}>
            Cole sua API key â detecÃ§Ã£o automÃ¡tica
          </Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 11, marginBottom: 6 }}>
            gsk_ Â· sk-or- Â· pplx- Â· AIza Â· xai- Â· sk-ant Â· sk-
          </Text>
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            <TextInput
              style={[styles.quickKeyInput, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.primary }]}
              value={quickKey}
              onChangeText={setQuickKey}
              placeholder="Cole qualquer API key aqui..."
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
            />
            <TouchableOpacity
              onPress={async () => {
                try {
                  const text = await Clipboard.getStringAsync();
                  if (text) setQuickKey(text.trim());
                } catch {}
              }}
              style={[styles.quickKeyBtn, { backgroundColor: colors.secondary }]}
            >
              <Feather name="clipboard" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
          {quickKey.length > 10 && (() => {
            const det = autoDetect(quickKey);
            return (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <Feather name="check-circle" size={12} color={colors.success} />
                <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
                  <Text style={{ color: colors.success, fontWeight: "700" }}>
                    {det?.name || "OpenAI"}
                  </Text>
                  {det ? ` Â· ${det.model}` : ""}
                </Text>
              </View>
            );
          })()}
          <TouchableOpacity
            onPress={handleSaveQuickKey}
            disabled={!quickKey.trim()}
            style={[styles.quickKeySave, { backgroundColor: quickKey.trim() ? colors.primary : colors.muted }]}
          >
            <Feather name="check" size={15} color={colors.primaryForeground} />
            <Text style={[{ color: colors.primaryForeground, fontWeight: "700", fontSize: 15 }]}>Salvar e Usar</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 12, gap: 8, paddingBottom: 8, flexGrow: 1 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <View style={[styles.emptyChat]}>
            <Feather name="cpu" size={28} color={colors.primary + "99"} />
            <Text style={[styles.emptyChatText, { color: colors.foreground }]}>IA Assistente</Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 12, textAlign: "center" }}>
              {activeFile ? `Contexto: ${activeFile.name}` : "Escreva abaixo ou toque em uma sugestÃ£o"}
            </Text>
          </View>
        }
      />

      {/* Chips de sugestÃ£o â aparecem ACIMA do input quando nÃ£o hÃ¡ mensagens */}
      {messages.length === 0 && !isLoading && (
        <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: 8 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}
          >
            {(chatMode === "juridico" ? [
              { label: "âï¸ Direitos do trabalhador", msg: "Quais sÃ£o os principais direitos do trabalhador CLT no Brasil? Cite os artigos relevantes." },
              { label: "ð  Contrato de aluguel", msg: "Quais sÃ£o os direitos e deveres do inquilino e locador num contrato de aluguel? (Lei 8.245/91)" },
              { label: "ð¨âð©âð¦ Direito de famÃ­lia", msg: "Como funciona o divÃ³rcio, guarda compartilhada e pensÃ£o alimentÃ­cia no Brasil?" },
              { label: "ð° DÃ­vida e cobranÃ§a", msg: "Como funciona a prescriÃ§Ã£o de dÃ­vidas no Brasil? Quais os prazos por tipo?" },
              { label: "ð Acidente de trÃ¢nsito", msg: "Quais sÃ£o os procedimentos legais apÃ³s um acidente de trÃ¢nsito com danos? CTB e CÃ³digo Civil." },
              { label: "ð Contrato de trabalho", msg: "Quais clÃ¡usulas essenciais deve ter um contrato de trabalho conforme a CLT?" },
              { label: "ðï¸ Habeas corpus", msg: "O que Ã© habeas corpus, quando usar e como impetrar? Artigos da CF e CPP." },
              { label: "ð¼ MEI e empresa", msg: "Quais sÃ£o as obrigaÃ§Ãµes legais de um MEI? Impostos, limites e direitos." },
            ] : SUGGESTION_CHIPS).map((chip) => (
              <TouchableOpacity
                key={chip.label}
                onPress={() => sendMessage(chip.msg)}
                style={[styles.suggestionChip, {
                  backgroundColor: chatMode === "juridico" ? "#1a1200" : colors.card,
                  borderColor: chatMode === "juridico" ? "#f59e0b44" : colors.border,
                }]}
              >
                <Text style={[styles.suggestionChipText, {
                  color: chatMode === "juridico" ? "#f59e0b" : colors.foreground,
                }]}>{chip.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Barra de input â sempre acessÃ­vel na base */}
      <View style={[styles.inputRow, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        {/* Colar â Ã­cone discreto, sem caixa */}
        <TouchableOpacity
          onPress={async () => {
            try {
              const text = await Clipboard.getStringAsync();
              if (text) {
                setInput((prev) => prev + text);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
            } catch {}
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={{ paddingHorizontal: 4, opacity: 0.6 }}
        >
          <Feather name="clipboard" size={18} color={colors.mutedForeground} />
        </TouchableOpacity>

        <TextInput
          style={[
            styles.chatInput,
            { color: colors.foreground, backgroundColor: colors.secondary, borderColor: colors.border },
          ]}
          value={input}
          onChangeText={(t) => { setInput(t); if (showQuickReplies) setShowQuickReplies(false); }}
          placeholder="Digite aqui e toque em â¶ Enviar"
          placeholderTextColor={colors.mutedForeground}
          multiline
          maxLength={4000}
          returnKeyType="default"
          blurOnSubmit={false}
        />

        {/* Stop quando gerando / Enviar quando parado */}
        {isLoading ? (
          <TouchableOpacity
            onPress={stopGeneration}
            style={[styles.sendButton, { backgroundColor: "#ef4444" }]}
          >
            <Feather name="square" size={14} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => { if (input.trim()) sendMessage(); }}
            style={[styles.sendButton, { backgroundColor: colors.primary }]}
          >
            <Feather name="send" size={16} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    gap: 8,
  },
  headerTitle: { flex: 1, fontSize: 14, fontWeight: "600" },
  providerBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  providerText: { fontSize: 11 },
  noProvider: { fontSize: 11 },
  resetBtn: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  modeBar: {
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
    borderBottomWidth: 1,
  },
  modeBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  quickKeyPanel: {
    padding: 14,
    borderBottomWidth: 1,
    gap: 10,
  },
  cortesiaBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 12,
  },
  quickKeyTitle: { fontSize: 13, fontWeight: "600" },
  quickKeyInput: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  quickKeyBtn: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  quickKeySave: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 13,
  },
  messageBubble: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  userBubble: { alignSelf: "flex-end", maxWidth: "85%", borderWidth: 0 },
  aiBubble: { alignSelf: "stretch" },
  aiLabel: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 },
  aiLabelText: { fontSize: 10, fontWeight: "700" },
  messageText: { fontSize: 14, lineHeight: 20 },
  emptyChat: { alignItems: "center", justifyContent: "center", paddingVertical: 40, paddingHorizontal: 16, gap: 8 },
  emptyChatText: { fontSize: 17, fontWeight: "700", textAlign: "center" },
  contextHint: { fontSize: 12, fontWeight: "600" },
  suggestionGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8, width: "100%" },
  suggestionChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  suggestionChipText: { fontSize: 13, fontWeight: "500" },
  quickReplyBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    maxHeight: 50,
  },
  quickReplyRow: {
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
    alignItems: "center",
  },
  quickReplyChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  quickReplyText: { fontSize: 13, fontWeight: "600" },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 10,
    borderTopWidth: 1,
    gap: 8,
  },
  chatInput: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    maxHeight: 100,
    fontSize: 14,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});
