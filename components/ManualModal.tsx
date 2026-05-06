import React, { useState, useCallback } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

interface ManualModalProps {
  visible: boolean;
  onClose: () => void;
}

const SECTIONS = [
  { id: "novidades",  icon: "ð", title: "v2.7.4" },
  { id: "inicio",     icon: "ð ", title: "InÃ­cio" },
  { id: "instalar",   icon: "ð²", title: "Instalar" },
  { id: "terminal",   icon: "ð¥ï¸", title: "Terminal" },
  { id: "db",         icon: "ðï¸", title: "Banco" },
  { id: "jasmim",     icon: "ð¤", title: "Jasmim" },
  { id: "github",     icon: "ð", title: "GitHub" },
  { id: "preview",    icon: "ð", title: "Preview" },
  { id: "importexport", icon: "ð¦", title: "Import/Export" },
  { id: "apikeys",    icon: "ð", title: "API Keys" },
  { id: "projetos",   icon: "ðï¸", title: "Projetos" },
  { id: "playground", icon: "ð®", title: "Playground" },
  { id: "termux",     icon: "ð¡", title: "Termux" },
];

export default function ManualModal({ visible, onClose }: ManualModalProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [activeSection, setActiveSection] = useState("novidades");
  const [copied, setCopied] = useState("");

  const copyText = useCallback(async (text: string, key: string) => {
    try {
      const Clipboard = await import("expo-clipboard");
      await Clipboard.setStringAsync(text);
      setCopied(key);
      setTimeout(() => setCopied(""), 1800);
    } catch {}
  }, []);

  const bg = colors.background;
  const card = colors.card;
  const border = colors.border;
  const fg = colors.foreground;
  const muted = colors.mutedForeground;
  const green = "#22c55e";
  const purple = "#7c3aed";
  const mono = Platform.OS === "ios" ? "Menlo" : "monospace";

  // ââ Sub-components ââââââââââââââââââââââââââââââââââââââ

  const H2 = ({ children }: { children: string }) => (
    <Text style={{ color: green, fontWeight: "700", fontSize: 14, marginTop: 18, marginBottom: 6 }}>
      {children}
    </Text>
  );

  const H3 = ({ children }: { children: string }) => (
    <Text style={{ color: "#86efac", fontWeight: "600", fontSize: 13, marginTop: 12, marginBottom: 4 }}>
      {children}
    </Text>
  );

  const P = ({ children }: { children: string }) => (
    <Text style={{ color: muted, fontSize: 13, lineHeight: 20, marginBottom: 6 }}>{children}</Text>
  );

  const Li = ({ children }: { children: string }) => (
    <View style={{ flexDirection: "row", gap: 6, marginBottom: 4 }}>
      <Text style={{ color: green, fontSize: 13 }}>âº</Text>
      <Text style={{ color: muted, fontSize: 13, lineHeight: 20, flex: 1 }}>{children}</Text>
    </View>
  );

  const Step = ({ n, children }: { n: number; children: string }) => (
    <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: "#1a3d14", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
        <Text style={{ color: green, fontWeight: "700", fontSize: 11 }}>{n}</Text>
      </View>
      <Text style={{ color: muted, fontSize: 13, lineHeight: 20, flex: 1 }}>{children}</Text>
    </View>
  );

  const Alert = ({ color, children }: { color: "green" | "blue" | "yellow" | "red"; children: string }) => {
    const styles = {
      green:  { bg: "#0d2210", border: "#2d5a1e", text: "#4ade80" },
      blue:   { bg: "#0a1530", border: "#1e3d7a", text: "#60a5fa" },
      yellow: { bg: "#1e1500", border: "#4a3800", text: "#fcd34d" },
      red:    { bg: "#1e0a0a", border: "#5a1e1e", text: "#f87171" },
    }[color];
    return (
      <View style={{ backgroundColor: styles.bg, borderWidth: 1, borderColor: styles.border, borderRadius: 8, padding: 12, marginBottom: 10 }}>
        <Text style={{ color: styles.text, fontSize: 13, lineHeight: 20 }}>{children}</Text>
      </View>
    );
  };

  const Code = ({ children, copyKey }: { children: string; copyKey?: string }) => (
    <View style={{ backgroundColor: "#0d1117", borderWidth: 1, borderColor: "#1e2d1e", borderRadius: 8, padding: 12, marginBottom: 10, position: "relative" }}>
      <Text style={{ color: "#a8d5a2", fontFamily: mono, fontSize: 12, lineHeight: 19 }}>{children}</Text>
      {copyKey && (
        <TouchableOpacity
          onPress={() => copyText(children, copyKey)}
          style={{ position: "absolute", top: 8, right: 8, backgroundColor: "#1a3d14", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5 }}
        >
          <Text style={{ color: green, fontSize: 11, fontWeight: "600" }}>
            {copied === copyKey ? "â Copiado" : "Copiar"}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const Card = ({ icon, title, desc }: { icon: string; title: string; desc: string }) => (
    <View style={{ backgroundColor: "#0d1309", borderWidth: 1, borderColor: "#2d4a1e", borderRadius: 8, padding: 12, marginBottom: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <Text style={{ fontSize: 14 }}>{icon}</Text>
        <Text style={{ color: green, fontWeight: "700", fontSize: 13 }}>{title}</Text>
      </View>
      <Text style={{ color: muted, fontSize: 12, lineHeight: 18 }}>{desc}</Text>
    </View>
  );

  // ââ Section Content ââââââââââââââââââââââââââââââââââââââ

  const renderSection = () => {
    switch (activeSection) {

      // ââ NOVIDADES v2.7.4 ââ
      case "novidades": return (
        <View>
          <Alert color="green">{"ð DevMobile v2.7.4 â Clone 50.000+ arquivos em segundos, extraÃ§Ã£o paralela e salvamento em segundo plano."}</Alert>

          <H2>{"â v2.7.4 â Velocidade mÃ¡xima"}</H2>

          <H3>{"â¡ ExtraÃ§Ã£o paralela â 200 arquivos ao mesmo tempo"}</H3>
          <P>{"Antes o app extraÃ­a 1 arquivo por vez do ZIP. Agora extrai 200 em paralelo com Promise.all. Resultado: 50.000 arquivos em segundos em vez de minutos."}</P>
          <Li>{"200 arquivos extraÃ­dos simultaneamente (paralelo real)"}</Li>
          <Li>{"Suporta 50.000+ arquivos sem travamento"}</Li>
          <Li>{"Progresso em tempo real durante a extraÃ§Ã£o"}</Li>

          <H3>{"ð Salvamento em segundo plano"}</H3>
          <P>{"O projeto aparece na tela IMEDIATAMENTE apÃ³s o clone. O salvamento no disco acontece em paralelo sem travar a UI."}</P>
          <Li>{"Arquivos visÃ­veis na hora â sem esperar o disco"}</Li>
          <Li>{"Ãrvore de arquivos abre assim que o clone termina"}</Li>

          <H3>{"ð§ Leitura do ZIP via XHR Blob (sem truncamento)"}</H3>
          <P>{"Corrigido bug onde o Hermes (engine JS do Android) truncava strings base64 maiores que ~16 MB. Agora usa XHR com responseType=blob â sem limite, sem arquivo faltando."}</P>
          <Li>{"ZIPs de 200 MB+ lidos sem truncamento"}</Li>
          <Li>{"40.000 arquivos chegam completos no APK"}</Li>

          <H2>{"ð v2.7.3 â CorreÃ§Ãµes crÃ­ticas"}</H2>
          <Li>{"Download via FileSystem.downloadAsync â sem estouro de memÃ³ria"}</Li>
          <Li>{"ImportaÃ§Ã£o ZIP/TAR corrigida â sem arquivos faltando"}</Li>
          <Li>{"Termux com porta configurÃ¡vel (padrÃ£o: 8080)"}</Li>

          <H2>{"ð v2.7.2 â Lote Ãºnico no AsyncStorage"}</H2>
          <Li>{"Todas as operaÃ§Ãµes de arquivo usam lote â sem race conditions"}</Li>

          <H2>{"ð v2.7.1 â Modo Offline"}</H2>
          <Li>{"App detecta quando nÃ£o hÃ¡ servidor e funciona offline"}</Li>

          <Alert color="blue">{"ð¡ v2.7.4 Ã© a versÃ£o mais rÃ¡pida jÃ¡ lanÃ§ada. Clone de 50.000 arquivos em segundos."}</Alert>
        </View>
      );

      // ââ INÃCIO RÃPIDO ââ
      case "inicio": return (
        <View>
          <P>{"Bem-vindo ao DevMobile â IDE no Celular. Editor profissional com terminal, IA (Jasmim), GitHub, banco de dados e Playground â tudo no seu Android."}</P>

          <H2>{"â¡ O que vocÃª pode fazer agora"}</H2>
          <Li>{"Criar projetos com modelos prontos (React, Node.js, Python, HTML...)"}</Li>
          <Li>{"Escrever cÃ³digo no editor Monaco com syntax highlight"}</Li>
          <Li>{"Pedir Ã  Jasmim (IA) para criar, corrigir e explicar cÃ³digo"}</Li>
          <Li>{"Conectar GitHub e fazer push/pull diretamente no app"}</Li>
          <Li>{"Configurar banco PostgreSQL (Neon) gratuitamente"}</Li>
          <Li>{"Usar o Playground HTML/React/JS com preview ao vivo"}</Li>
          <Li>{"Exportar projetos como ZIP e importar de volta"}</Li>

          <H2>{"ð¯ Primeira vez? FaÃ§a isso"}</H2>
          <Step n={1}>{"Toque em + na tela inicial ou na aba CRIAR"}</Step>
          <Step n={2}>{"Escolha um modelo (React, Node.js, Python, HTML...)"}</Step>
          <Step n={3}>{"O editor abre com os arquivos do modelo prontos"}</Step>
          <Step n={4}>{"Toque em â° (Menu Completo) para ver todas as funÃ§Ãµes"}</Step>
          <Step n={5}>{"Toque no Ã­cone ð¤ no canto superior direito para chamar a Jasmim"}</Step>

          <H2>{"ð± Instalar como App no celular"}</H2>
          <Li>{"Android/Chrome: Menu â® â 'Adicionar Ã  tela inicial'"}</Li>
          <Li>{"Para APK nativo: veja a seÃ§Ã£o ð² Instalar"}</Li>

          <H2>{"â¨ï¸ Atalhos do Editor"}</H2>
          <Li>{"Toque longo no cÃ³digo â menu de aÃ§Ãµes rÃ¡pidas"}</Li>
          <Li>{"Barra â¡ acima do teclado â inserir {}, (), [], ; e mais"}</Li>
          <Li>{"BotÃ£o â/â no terminal â navegar histÃ³rico de comandos"}</Li>
        </View>
      );

      // ââ INSTALAR ââ
      case "instalar": return (
        <View>
          <Alert color="green">{"â DevMobile gera APK Android real via EAS Build. O APK Ã© instalado diretamente no celular sem precisar da Play Store."}</Alert>

          <H2>{"ð± APK via EAS Build (recomendado)"}</H2>
          <Step n={1}>{"Instale o EAS CLI no computador:\nnpx install -g eas-cli"}</Step>
          <Step n={2}>{"FaÃ§a login no Expo:\neas login"}</Step>
          <Step n={3}>{"Dentro da pasta do projeto:\neas build -p android --profile preview"}</Step>
          <Step n={4}>{"Aguarde o build (5-15 min). VocÃª recebe o link do .apk"}</Step>
          <Step n={5}>{"Baixe o .apk e instale no celular Android"}</Step>

          <H2>{"ð² Instalar o APK no celular"}</H2>
          <Step n={1}>{"Transfira o .apk pelo Google Drive, WhatsApp para si mesmo, email ou cabo USB"}</Step>
          <Step n={2}>{"No Android: ConfiguraÃ§Ãµes â Privacidade â ative 'Instalar apps desconhecidos'"}</Step>
          <Step n={3}>{"Abra o gerenciador de arquivos, localize o .apk e toque nele"}</Step>
          <Step n={4}>{"Toque em Instalar â â App instalado!"}</Step>

          <Alert color="blue">{"ð¡ Para uso PWA (sem APK): Chrome Android â menu â® â 'Adicionar Ã  tela inicial'. Funciona online â carrega mais rÃ¡pido que baixar o APK."}</Alert>

          <H2>{"ð iPhone/iPad"}</H2>
          <Li>{"Safari â botÃ£o Compartilhar â 'Adicionar Ã  Tela de InÃ­cio'"}</Li>
          <Li>{"Funciona como PWA â requer internet para abrir"}</Li>
          <Li>{"APK sÃ³ funciona em Android. iOS nÃ£o suporta instalaÃ§Ã£o fora da App Store"}</Li>

          <H2>{"ð¥ï¸ Computador (Windows/Mac/Linux)"}</H2>
          <Li>{"Chrome â Ã­cone â na barra de endereÃ§o â Instalar"}</Li>
          <Li>{"Abre numa janela prÃ³pria sem abas do navegador"}</Li>
          <Li>{"Aparece no menu Iniciar (Windows) ou Launchpad (Mac)"}</Li>
        </View>
      );

      // ââ TERMINAL ââ
      case "terminal": return (
        <View>
          <P>{"O Terminal do DevMobile executa comandos bash reais via servidor. Abra com â° â Terminal ou pelo Ã­cone â¬ na barra inferior."}</P>

          <H2>{"ð§ Comandos mais usados"}</H2>

          <H3>{"Gerenciar pacotes Node.js"}</H3>
          <Code copyKey="npm">{"npm install express axios cors dotenv\nnpm run dev\nnpm start\nnpm run build"}</Code>

          <H3>{"Gerenciar pacotes Python"}</H3>
          <Code copyKey="pip">{"pip install flask requests pandas sqlalchemy\npython app.py\npython -m pytest"}</Code>

          <H3>{"NavegaÃ§Ã£o e arquivos"}</H3>
          <Code copyKey="nav">{"ls -la           # listar arquivos\npwd              # diretÃ³rio atual\ncd meu-projeto   # entrar na pasta\nmkdir nova-pasta # criar pasta\ncat package.json # ler arquivo"}</Code>

          <H3>{"Processos"}</H3>
          <Code copyKey="proc">{"ps aux | grep node    # ver processos rodando\nkill -9 PID          # encerrar pelo ID\nlsof -i :3000        # ver quem usa a porta"}</Code>

          <H3>{"Git"}</H3>
          <Code copyKey="git">{"git status\ngit add .\ngit commit -m \"minha mensagem\"\ngit push origin main"}</Code>

          <H2>{"âï¸ VariÃ¡veis de ambiente (.env)"}</H2>
          <Code copyKey="env">{"DATABASE_URL=postgresql://user:pass@host/db?sslmode=require\nPORT=3000\nJWT_SECRET=minha-chave-secreta\nNODE_ENV=development"}</Code>

          <H2>{"ð Rodar servidor"}</H2>
          <Code copyKey="server">{"node index.js            # Node puro\nnpm run dev              # com nodemon\nnpx ts-node src/main.ts  # TypeScript\nuvicorn main:app --reload # FastAPI"}</Code>

          <H2>{"ð¡ Dicas do Terminal"}</H2>
          <Li>{"Use â / â para navegar no histÃ³rico de comandos"}</Li>
          <Li>{"Ctrl+C para parar qualquer processo"}</Li>
          <Li>{"Use o microfone ðï¸ para ditar comandos"}</Li>
          <Li>{"PeÃ§a para a Jasmim: \"rode npm install e corrija os erros\""}</Li>
        </View>
      );

      // ââ BANCO DE DADOS ââ
      case "db": return (
        <View>
          <P>{"Neon DB Ã© PostgreSQL serverless gratuito â a melhor opÃ§Ã£o para projetos profissionais. Sem cartÃ£o de crÃ©dito."}</P>

          <H2>{"ð Criar banco em 5 minutos"}</H2>
          <Step n={1}>{"Acesse neon.tech e crie conta gratuita (sem cartÃ£o)"}</Step>
          <Step n={2}>{"Clique em 'New Project' â dÃª um nome"}</Step>
          <Step n={3}>{"VÃ¡ em 'Connection Details' e copie a Connection String"}</Step>
          <Step n={4}>{"No DevMobile: â° â Banco de Dados â cole a URL"}</Step>
          <Step n={5}>{"Toque em 'Testar ConexÃ£o' â pronto! â"}</Step>

          <H2>{"ð¦ Instalar dependÃªncias"}</H2>
          <Code copyKey="neon-install">{"npm install @neondatabase/serverless dotenv"}</Code>

          <H2>{"ð Arquivo de conexÃ£o (db/neon.js)"}</H2>
          <Code copyKey="neon-connect">{"const { neon } = require('@neondatabase/serverless');\nrequire('dotenv').config();\n\nconst sql = neon(process.env.DATABASE_URL);\n\nasync function initDb() {\n  await sql`\n    CREATE TABLE IF NOT EXISTS usuarios (\n      id SERIAL PRIMARY KEY,\n      nome VARCHAR(255) NOT NULL,\n      email VARCHAR(255) UNIQUE NOT NULL,\n      criado_em TIMESTAMP DEFAULT NOW()\n    )\n  `;\n  console.log('â Banco inicializado!');\n}\n\nmodule.exports = { sql, initDb };"}</Code>

          <H2>{"â¡ SQL Ãºtil"}</H2>
          <Code copyKey="sql">{"-- Criar tabela\nCREATE TABLE IF NOT EXISTS tarefas (\n  id SERIAL PRIMARY KEY,\n  titulo VARCHAR(255) NOT NULL,\n  concluida BOOLEAN DEFAULT false,\n  criado_em TIMESTAMP DEFAULT NOW()\n);\n\n-- Inserir\nINSERT INTO tarefas (titulo) VALUES ('Primeira tarefa');\n\n-- Consultar\nSELECT * FROM tarefas ORDER BY criado_em DESC LIMIT 10;\n\n-- Alterar\nALTER TABLE tarefas ADD COLUMN descricao TEXT;"}</Code>

          <H2>{"â ï¸ Regras importantes"}</H2>
          <Li>{"NUNCA commite o .env com dados reais no git"}</Li>
          <Li>{"SEMPRE crie .gitignore com .env listado"}</Li>
          <Li>{"Use sslmode=require na URL do Neon"}</Li>
          <Li>{"Toque em 'ð Gerar .env' no painel para criar o arquivo automaticamente"}</Li>
        </View>
      );

      // ââ JASMIM ââ
      case "jasmim": return (
        <View>
          <P>{"Jasmim Ã© sua IA desenvolvedora sÃªnior â cria projetos completos, corrige erros e configura banco automaticamente. Toque no Ã­cone ð¤ no editor."}</P>

          <H2>{"ð¯ O que a Jasmim faz"}</H2>
          <Li>{"Criar projeto do zero em qualquer linguagem/framework"}</Li>
          <Li>{"Instalar dependÃªncias (npm, pip, qualquer gerenciador)"}</Li>
          <Li>{"Criar e modificar qualquer arquivo do projeto"}</Li>
          <Li>{"Configurar banco de dados completo (schema, tabelas)"}</Li>
          <Li>{"Adicionar autenticaÃ§Ã£o JWT, rotas, APIs REST"}</Li>
          <Li>{"Corrigir erros automaticamente ao ver o terminal"}</Li>
          <Li>{"Fazer push para GitHub quando vocÃª pedir"}</Li>

          <H2>{"ð Exemplos de comandos"}</H2>

          <H3>{"Criar projeto completo"}</H3>
          <Code copyKey="j1">{"\"Crie um app de lista de tarefas com React, Node.js/Express, Neon DB PostgreSQL e autenticaÃ§Ã£o JWT. Interface em portuguÃªs.\""}</Code>

          <H3>{"Corrigir erro"}</H3>
          <Code copyKey="j2">{"\"Tem um erro no terminal acima, corrija.\""}</Code>

          <H3>{"Adicionar funcionalidade"}</H3>
          <Code copyKey="j3">{"\"Adicione upload de arquivos PDF usando multer. Salve os arquivos na pasta uploads/.\""}</Code>

          <H3>{"Refatorar"}</H3>
          <Code copyKey="j4">{"\"Reorganize o projeto seguindo boas prÃ¡ticas do Express: routes/, controllers/, models/, middleware/.\""}</Code>

          <H2>{"ð§  MemÃ³ria da Jasmim"}</H2>
          <P>{"A Jasmim guarda informaÃ§Ãµes sobre seu projeto no arquivo .jasmim-memory.json. Acesse em â° â MemÃ³ria da Jasmim para ver e editar."}</P>
          <Li>{"DecisÃµes tÃ©cnicas tomadas"}</Li>
          <Li>{"Tecnologias usadas no projeto"}</Li>
          <Li>{"Progresso e prÃ³ximos passos"}</Li>

          <H2>{"ð¬ Campo Livre"}</H2>
          <P>{"Para conversas sem restriÃ§Ãµes: â° â Campo Livre. Ideal para tirar dÃºvidas gerais, pesquisa ou texto livre sem contexto de cÃ³digo."}</P>
        </View>
      );

      // ââ GITHUB ââ
      case "github": return (
        <View>
          <P>{"Conecte seu repositÃ³rio GitHub ao DevMobile para fazer push, pull e gerenciar branches. Acesse em â° â GitHub."}</P>

          <H2>{"ð Criar Personal Access Token (PAT)"}</H2>
          <Step n={1}>{"Acesse: github.com â Settings â Developer Settings"}</Step>
          <Step n={2}>{"VÃ¡ em: Personal access tokens â Tokens (classic) â Generate new token"}</Step>
          <Step n={3}>{"PermissÃµes: marque repo (todas) e workflow"}</Step>
          <Step n={4}>{"Copie o token â comeÃ§a com ghp_..."}</Step>
          <Step n={5}>{"No DevMobile: â° â GitHub â cole o token no campo"}</Step>
          <Step n={6}>{"Toque em 'ð Colar Token e Conectar' para conectar com 1 toque"}</Step>

          <H2>{"ð¦ OperaÃ§Ãµes disponÃ­veis"}</H2>
          <Li>{"Clonar repositÃ³rio â suporta 38.000+ arquivos via zipball (1 requisiÃ§Ã£o)"}</Li>
          <Li>{"Commit e push de arquivos modificados"}</Li>
          <Li>{"Pull para atualizar com o repositÃ³rio remoto"}</Li>
          <Li>{"Ver diff dos arquivos modificados"}</Li>
          <Li>{"Criar e trocar de branch"}</Li>

          <Alert color="green">{"â v2.7.3: Clone usa zipball â baixa o repo inteiro como ZIP em 1 chamada. Sem rate limit, sem arquivos faltando, mesmo em repos gigantes."}</Alert>

          <H2>{"ð¥ï¸ Git via Terminal"}</H2>
          <Code copyKey="git-full">{"# Configurar identidade (primeira vez)\ngit config --global user.name \"Seu Nome\"\ngit config --global user.email \"seu@email.com\"\n\n# Clonar repositÃ³rio\ngit clone https://github.com/usuario/repo.git\n\n# RepositÃ³rio privado (com token)\ngit clone https://SEU_TOKEN@github.com/usuario/repo.git\n\n# Fazer commit e push\ngit add .\ngit commit -m \"feat: adiciona funcionalidade X\"\ngit push origin main\n\n# Criar branch nova\ngit checkout -b minha-feature\ngit push -u origin minha-feature"}</Code>

          <H2>{"â ï¸ SeguranÃ§a"}</H2>
          <Li>{"NUNCA commite arquivos .env com senhas"}</Li>
          <Li>{"Adicione .env ao .gitignore ANTES do primeiro commit"}</Li>
          <Li>{"Seu token fica armazenado localmente â nunca Ã© exposto"}</Li>
        </View>
      );

      // ââ PREVIEW ââ
      case "preview": return (
        <View>
          <P>{"O preview renderiza HTML, CSS e JS diretamente no app â sem precisar abrir o navegador externo."}</P>

          <H2>{"ð¥ï¸ Como abrir o Preview"}</H2>
          <Li>{"Com arquivo .html aberto: toque em 'ð Preview' na barra inferior do editor"}</Li>
          <Li>{"Ou toque no Ã­cone ðï¸ no cabeÃ§alho do editor"}</Li>
          <Li>{"O Preview abre mostrando o HTML renderizado ao vivo"}</Li>

          <H2>{"â Para o preview funcionar"}</H2>
          <Li>{"O arquivo aberto precisa ter extensÃ£o .html"}</Li>
          <Li>{"CSS e JS inline ou em <script> e <style> sÃ£o executados"}</Li>
          <Li>{"BotÃµes onclick, alert, prompt â tudo funciona"}</Li>

          <H2>{"ð® Playground (preview mais poderoso)"}</H2>
          <P>{"Para HTML livre sem abrir um arquivo: â° â Playground HTML"}</P>
          <Li>{"Modo HTML: qualquer HTML com botÃµes, animaÃ§Ãµes, formulÃ¡rios"}</Li>
          <Li>{"Modo âï¸ React: escreva function App() e veja ao vivo (Babel + React CDN)"}</Li>
          <Li>{"Modo â¡ JS: JavaScript com console visual (saÃ­da dos console.log)"}</Li>
          <Li>{"Toggle AUTO: renderiza 0,9s apÃ³s parar de digitar"}</Li>

          <H2>{"ð Preview de app Node.js/React"}</H2>
          <Code copyKey="preview-node">{"# 1. Instale as dependÃªncias\nnpm install\n\n# 2. Rode o servidor\nnpm run dev   # ou: npm start\n\n# O servidor inicia e mostra a URL de acesso"}</Code>
        </View>
      );

      // ââ IMPORTAR / EXPORTAR ââ
      case "importexport": return (
        <View>
          <Alert color="green">{"â v2.7.3 â ImportaÃ§Ã£o 100% corrigida. RepositÃ³rios com 38.000+ arquivos importam sem nenhum arquivo faltando."}</Alert>

          <H2>{"ð¥ Importar projeto (ZIP)"}</H2>
          <Step n={1}>{"Toque em â° â Importar ZIP"}</Step>
          <Step n={2}>{"Selecione o arquivo .zip do seu projeto"}</Step>
          <Step n={3}>{"O DevMobile extrai e carrega TODOS os arquivos â sem limite"}</Step>
          <Step n={4}>{"CompatÃ­vel com VS Code, GitHub (Download ZIP), Glitch e outros"}</Step>
          <Alert color="blue">{"ð¡ Funciona tambÃ©m no editor (aba Editor â â° â Importar ZIP) para adicionar arquivos a um projeto jÃ¡ aberto â preserva estrutura de pastas."}</Alert>

          <H2>{"ð¤ Exportar projeto"}</H2>
          <Step n={1}>{"Abra o projeto que quer exportar"}</Step>
          <Step n={2}>{"Toque em â° â Exportar ZIP"}</Step>
          <Step n={3}>{"Um arquivo .zip com todos os arquivos Ã© gerado"}</Step>
          <Step n={4}>{"Compartilhe via WhatsApp, Google Drive ou salve localmente"}</Step>

          <H2>{"â¬ï¸ Trazer projeto de outro servidor"}</H2>
          <P>{"MÃ©todo 1 â Via ZIP (mais fÃ¡cil):"}</P>
          <Step n={1}>{"Abra o projeto no servidor"}</Step>
          <Step n={2}>{"Clique nos 3 pontinhos (â¯) â Files â Download as zip"}</Step>
          <Step n={3}>{"Salve o .zip no celular (Drive, WhatsApp, cabo...)"}</Step>
          <Step n={4}>{"No DevMobile: â° â Importar ZIP â selecione o arquivo"}</Step>
          <Step n={5}>{"Todos os arquivos aparecem â sem nenhum faltando â"}</Step>

          <P>{"MÃ©todo 2 â Via GitHub (clone direto no app):"}</P>
          <Step n={1}>{"â° â Importar do Git â cole a URL do repositÃ³rio"}</Step>
          <Step n={2}>{"O DevMobile baixa o repo INTEIRO como ZIP em 1 requisiÃ§Ã£o"}</Step>
          <Step n={3}>{"Suporta 38.000+ arquivos sem rate limit"}</Step>

          <H2>{"ð¡ Dicas"}</H2>
          <Li>{"node_modules Ã© ignorado na exportaÃ§Ã£o â muito pesado"}</Li>
          <Li>{"Arquivos .env sÃ£o incluÃ­dos â cuidado ao compartilhar"}</Li>
          <Li>{"A MemÃ³ria da Jasmim (.jasmim-memory.json) vai junto no ZIP"}</Li>
          <Li>{"TAR e TAR.GZ tambÃ©m sÃ£o suportados (â° â Importar TAR)"}</Li>
        </View>
      );

      // ââ API KEYS ââ
      case "apikeys": return (
        <View>
          <P>{"O DevMobile usa chaves de API para conectar serviÃ§os externos. Todas ficam armazenadas localmente no dispositivo."}</P>

          <H2>{"ð Onde configurar cada credencial"}</H2>
          <Card icon="ð¤" title="API Key de IA (OpenAI, Gemini, Groq...)" desc="Painel da Jasmim â âï¸ ConfiguraÃ§Ãµes. Prefixos: sk- (OpenAI), AIza (Gemini), gsk_ (Groq), sk-ant (Anthropic), xai- (Grok)" />
          <Card icon="ð" title="GitHub Personal Access Token" desc="â° â GitHub â Inserir credenciais. ComeÃ§a com ghp_... PermissÃµes: repo, workflow" />
          <Card icon="ðï¸" title="Connection String do Banco" desc="â° â Banco de Dados â cole a URL. postgresql://user:pass@host/db?sslmode=require" />

          <H2>{"â¡ DetecÃ§Ã£o automÃ¡tica de provedor"}</H2>
          <P>{"A Jasmim detecta o provedor pela sua API key:"}</P>
          <Code copyKey="providers">{"gsk_     â Groq (rÃ¡pido e gratuito)\nsk-or-   â OpenRouter\nAIza     â Google Gemini\nxai-     â Grok (xAI)\nsk-ant   â Anthropic Claude\nsk-      â OpenAI\npplx-    â Perplexity\nneon_api_â Neon DB API"}</Code>

          <H2>{"ð SeguranÃ§a"}</H2>
          <Li>{"Credenciais ficam no armazenamento local do dispositivo"}</Li>
          <Li>{"API keys sÃ£o enviadas apenas ao backend do DevMobile (nunca expostas)"}</Li>
          <Li>{"Para trocar, cole a nova chave no mesmo campo"}</Li>
          <Li>{"Para revogar, delete a key no serviÃ§o externo (GitHub, OpenAI, etc.)"}</Li>

          <H2>{"ð³ OpÃ§Ã£o sem chave (Cortesia)"}</H2>
          <P>{"O DevMobile tem um servidor prÃ³prio que oferece IA sem precisar de chave. Acesse em Jasmim â âï¸ â Cortesia. Ideal para comeÃ§ar."}</P>
        </View>
      );

      // ââ MEUS PROJETOS ââ
      case "projetos": return (
        <MeusProjetosSection
          H2={H2} H3={H3} P={P} Li={Li} Step={Step} Alert={Alert} Code={Code}
          copied={copied} copyText={copyText}
          colors={{ fg, muted, card, border, green }}
        />
      );

      // ââ PLAYGROUND ââ
      case "playground": return (
        <View>
          <P>{"O Playground permite escrever e visualizar HTML, React ou JavaScript ao vivo â sem precisar criar um arquivo de projeto. Acesse em â° â Playground HTML."}</P>

          <H2>{"ð Modo HTML"}</H2>
          <P>{"Escreva qualquer cÃ³digo HTML/CSS/JS e veja renderizado ao vivo."}</P>
          <Li>{"BotÃµes onclick, alert, prompt â tudo funciona"}</Li>
          <Li>{"Estilos CSS inline e em <style>"}</Li>
          <Li>{"Scripts JavaScript em <script>"}</Li>
          <Code copyKey="html-ex">{"<!DOCTYPE html>\n<html>\n<head>\n  <style>\n    body { font-family: sans-serif; padding: 20px; }\n    button { padding: 10px 20px; background: #7c3aed;\n             color: white; border: none; border-radius: 8px; }\n  </style>\n</head>\n<body>\n  <h1>Meu App</h1>\n  <button onclick=\"alert('Funcionou!')\">Clique</button>\n</body>\n</html>"}</Code>

          <H2>{"âï¸ Modo React"}</H2>
          <P>{"Escreva um componente React completo com hooks. O Playground usa React CDN + Babel â nÃ£o precisa de npm."}</P>
          <Li>{"Escreva function App() { ... } e veja ao vivo"}</Li>
          <Li>{"useState, useEffect, useMemo, useRef â todos disponÃ­veis"}</Li>
          <Li>{"Estilo inline com objetos JavaScript"}</Li>
          <Code copyKey="react-ex">{"function App() {\n  const [count, setCount] = React.useState(0);\n  return (\n    <div style={{padding: 20, fontFamily: 'sans-serif'}}>\n      <h1>Contador: {count}</h1>\n      <button onClick={() => setCount(c => c + 1)}\n        style={{padding: '10px 20px', background: '#7c3aed',\n                color: '#fff', border: 'none', borderRadius: 8}}>\n        +1\n      </button>\n    </div>\n  );\n}"}</Code>

          <H2>{"â¡ Modo JavaScript"}</H2>
          <P>{"JavaScript puro com console visual. Os console.log aparecem na tela."}</P>
          <Code copyKey="js-ex">{"const dados = [1, 2, 3, 4, 5];\nconsole.log('Soma:', dados.reduce((a, b) => a + b, 0));\nconsole.log('Quadrados:', dados.map(n => n * n));\n\nconst fatorial = n => n <= 1 ? 1 : n * fatorial(n - 1);\nconsole.log('5! =', fatorial(5));"}</Code>

          <H2>{"âï¸ Controles do Playground"}</H2>
          <Li>{"Toggle AUTO/MANUAL: AUTO atualiza 0,9s apÃ³s parar de digitar"}</Li>
          <Li>{"â¶ Renderizar: atualiza a prÃ©via manualmente"}</Li>
          <Li>{"ð Copiar: copia todo o cÃ³digo para a Ã¡rea de transferÃªncia"}</Li>
          <Li>{"ð¾ Salvar: cria um arquivo no projeto aberto com o cÃ³digo"}</Li>
          <Li>{"ðï¸ Limpar: apaga o cÃ³digo (pede confirmaÃ§Ã£o)"}</Li>
        </View>
      );

      case "termux": return (
        <View>
          <Alert color="blue">{"ð¡ Modo Termux v2.7.3 â terminal Linux real no seu celular, sem internet, 100% offline. O servidor roda direto no celular pelo Termux."}</Alert>

          <H2>{"ð² Passo 1 â Instalar o Termux"}</H2>
          <P>{"Baixe o Termux pelo F-Droid (NÃO pela Play Store â a versÃ£o da Play Store estÃ¡ desatualizada)."}</P>
          <Step n={1}>{"Abra o navegador e acesse: f-droid.org"}</Step>
          <Step n={2}>{"Busque por \"Termux\" e instale"}</Step>
          <Step n={3}>{"Se aparecer aviso de seguranÃ§a, permita instalar de fontes desconhecidas"}</Step>
          <Alert color="yellow">{"â ï¸ SÃ³ instale pelo F-Droid. A versÃ£o da Play Store estÃ¡ desatualizada e nÃ£o funciona."}</Alert>

          <H2>{"âï¸ Passo 2 â Preparar o Termux"}</H2>
          <P>{"Abra o Termux e execute esses comandos um por um:"}</P>
          <H3>{"Atualizar pacotes:"}</H3>
          <Code copyKey="termux-update">{"pkg update && pkg upgrade -y"}</Code>
          <H3>{"Instalar Node.js, Git e curl:"}</H3>
          <Code copyKey="termux-node">{"pkg install nodejs git curl -y"}</Code>
          <H3>{"Verificar instalaÃ§Ã£o:"}</H3>
          <Code copyKey="termux-check">{"node --version && npm --version && git --version"}</Code>
          <Alert color="green">{"â Se aparecer versÃµes para os trÃªs comandos, estÃ¡ pronto para o prÃ³ximo passo."}</Alert>

          <H2>{"ð¥ Passo 3 â Instalar o servidor DevMobile (1 comando)"}</H2>
          <P>{"Cole esse comando no Termux â ele baixa e instala tudo automaticamente:"}</P>
          <Code copyKey="termux-install-auto">{"curl -fsSL https://SEU-SERVIDOR.com/api/termux/setup.sh | bash"}</Code>
          <Alert color="yellow">{"â³ Aguarde 3-5 minutos. O script instala Node.js, Express, e o servidor DevMobile automaticamente."}</Alert>
          <Alert color="green">{"â Quando aparecer: 'â InstalaÃ§Ã£o concluÃ­da!' â estÃ¡ pronto!"}</Alert>

          <H2>{"â¶ï¸ Passo 4 â Iniciar o servidor"}</H2>
          <P>{"Toda vez que quiser usar o DevMobile offline, abra o Termux e execute:"}</P>
          <Code copyKey="termux-start">{"bash ~/start-devmobile.sh"}</Code>
          <P>{"O servidor vai mostrar:"}</P>
          <Code>{"ð DevMobile Server rodando na porta 8080\nâ Terminal, IA e plugins prontos\nAcesse: http://127.0.0.1:8080"}</Code>
          <Alert color="green">{"â Deixe o Termux aberto em segundo plano (minimize, nÃ£o feche)."}</Alert>

          <H2>{"ð Passo 5 â Conectar o DevMobile ao Termux"}</H2>
          <P>{"No app DevMobile, vÃ¡ em ConfiguraÃ§Ãµes e ative o Modo Termux:"}</P>
          <Step n={1}>{"Abra o DevMobile â toque no Ã­cone de engrenagem âï¸ (aba Conf.)"}</Step>
          <Step n={2}>{"Role atÃ© a seÃ§Ã£o SERVIDOR BACKEND"}</Step>
          <Step n={3}>{"Confira a Porta do Termux (padrÃ£o: 8080) â mude se precisar"}</Step>
          <Step n={4}>{"Toque em 'ð± Ativar Modo Termux' â detecta automaticamente em 127.0.0.1"}</Step>
          <Alert color="green">{"â Pronto! Terminal, IA Cortesia e instalaÃ§Ã£o de plugins agora usam o Termux â sem internet."}</Alert>

          <H2>{"âï¸ Porta diferente de 8080?"}</H2>
          <P>{"Se seu servidor Termux roda em outra porta (ex: 3000, 8888):"}</P>
          <Step n={1}>{"ConfiguraÃ§Ãµes â Servidor Backend â Porta do Termux"}</Step>
          <Step n={2}>{"Toque no nÃºmero e altere para a porta desejada"}</Step>
          <Step n={3}>{"Toque OK â o app detecta na nova porta automaticamente"}</Step>
          <P>{"Para rodar o servidor em outra porta no Termux:"}</P>
          <Code copyKey="termux-custom-port">{"PORT=3000 node ~/devmobile-server/server.mjs"}</Code>

          <H2>{"ð Uso no dia a dia (2 passos)"}</H2>
          <Step n={1}>{"Abra o Termux â digite: bash ~/start-devmobile.sh â minimize"}</Step>
          <Step n={2}>{"Abra o DevMobile e use normalmente"}</Step>
          <Alert color="blue">{"ð¡ Dois apps abertos ao mesmo tempo: Termux (servidor) + DevMobile (IDE). Funciona offline, no metrÃ´, em qualquer lugar."}</Alert>

          <H2>{"â Problemas comuns"}</H2>
          <H3>{"\"Port 8080 already in use\""}</H3>
          <Code copyKey="fix-port">{"pkill -f server.mjs\nbash ~/start-devmobile.sh"}</Code>
          <H3>{"Terminal do DevMobile mostra erro de conexÃ£o"}</H3>
          <Li>{"Verifique se o Termux estÃ¡ aberto e o servidor rodando"}</Li>
          <Li>{"Confirme a porta em ConfiguraÃ§Ãµes â Servidor Backend â Porta do Termux"}</Li>
          <Li>{"O app tenta 127.0.0.1:PORTA a cada 8 segundos automaticamente"}</Li>
          <H3>{"InstalaÃ§Ã£o falhou ou script nÃ£o rodou â instale manualmente:"}</H3>
          <Code copyKey="termux-manual">{"mkdir -p ~/devmobile-server && cd ~/devmobile-server\ncurl -fsSL https://SEU-SERVIDOR.com/api/termux/server.mjs -o server.mjs\nnpm install express cors\nnode server.mjs"}</Code>
          <H3>{"Quer voltar ao modo automÃ¡tico (sem Termux)"}</H3>
          <Li>{"ConfiguraÃ§Ãµes â URL do Servidor â toque em Limpar URL"}</Li>
          <Li>{"O app volta a detectar automaticamente o melhor servidor disponÃ­vel"}</Li>
        </View>
      );

      default: return <P>{"SeÃ§Ã£o nÃ£o encontrada."}</P>;
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: bg }}>

        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: insets.top + 6, paddingBottom: 10, backgroundColor: card, borderBottomWidth: 1, borderBottomColor: border, gap: 10 }}>
          <Text style={{ color: fg, fontWeight: "700", fontSize: 17, flex: 1 }}>ð Manual DevMobile v2.7.3</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Feather name="x" size={22} color={muted} />
          </TouchableOpacity>
        </View>

        {/* Section Tabs */}
        <View style={{ backgroundColor: card, borderBottomWidth: 1, borderBottomColor: border }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 10, paddingVertical: 8, gap: 6 }}>
            {SECTIONS.map((sec) => (
              <TouchableOpacity
                key={sec.id}
                onPress={() => setActiveSection(sec.id)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 5,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 20,
                  backgroundColor: activeSection === sec.id ? purple : `${purple}22`,
                  borderWidth: 1,
                  borderColor: activeSection === sec.id ? purple : border,
                }}
              >
                <Text style={{ fontSize: 12 }}>{sec.icon}</Text>
                <Text style={{ color: activeSection === sec.id ? "#fff" : muted, fontSize: 12, fontWeight: activeSection === sec.id ? "700" : "500" }}>
                  {sec.title}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Content */}
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
          {renderSection()}
        </ScrollView>

      </View>
    </Modal>
  );
}

// ââ Meus Projetos (sub-tabs) ââââââââââââââââââââââââââââââ

type SharedProps = {
  H2: (p: { children: string }) => JSX.Element;
  H3: (p: { children: string }) => JSX.Element;
  P: (p: { children: string }) => JSX.Element;
  Li: (p: { children: string }) => JSX.Element;
  Step: (p: { n: number; children: string }) => JSX.Element;
  Alert: (p: { color: "green" | "blue" | "yellow" | "red"; children: string }) => JSX.Element;
  Code: (p: { children: string; copyKey?: string }) => JSX.Element;
  copied: string;
  copyText: (text: string, key: string) => void;
  colors: { fg: string; muted: string; card: string; border: string; green: string };
};

const PROJ_TABS = [
  { id: "trazer",   icon: "â¬ï¸", label: "Trazer" },
  { id: "juntar",   icon: "ð", label: "Juntar Apps" },
  { id: "duplicar", icon: "ð", label: "Duplicar" },
  { id: "organizar",icon: "ð§­", label: "Organizar" },
];

function MeusProjetosSection({ H2, H3, P, Li, Step, Alert, Code, colors }: SharedProps) {
  const [tab, setTab] = useState("trazer");
  const { card, border, muted, green } = colors;
  const purple = "#7c3aed";

  return (
    <View>
      {/* Sub-tabs */}
      <View style={{ flexDirection: "row", marginBottom: 16, gap: 6, flexWrap: "wrap" }}>
        {PROJ_TABS.map((t) => (
          <TouchableOpacity
            key={t.id}
            onPress={() => setTab(t.id)}
            style={{
              flexDirection: "row", alignItems: "center", gap: 4,
              paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16,
              backgroundColor: tab === t.id ? "#1a3d14" : card,
              borderWidth: 1, borderColor: tab === t.id ? green : border,
            }}
          >
            <Text style={{ fontSize: 12 }}>{t.icon}</Text>
            <Text style={{ color: tab === t.id ? green : muted, fontSize: 12, fontWeight: tab === t.id ? "700" : "400" }}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === "trazer" && (
        <View>
          <Alert color="blue">{"â¬ï¸ VocÃª nÃ£o precisa recriar nada. Seus projetos chegam aqui prontos â cÃ³digo, arquivos e tudo mais."}</Alert>

          <H2>{"ð¦ MÃ©todo 1 â Via ZIP (mais fÃ¡cil)"}</H2>
          <Step n={1}>{"Abra o projeto no servidor"}</Step>
          <Step n={2}>{"Clique nos 3 pontinhos (â¯) â Files â Download as zip"}</Step>
          <Step n={3}>{"Salve o .zip no celular (Google Drive, WhatsApp, etc.)"}</Step>
          <Step n={4}>{"No DevMobile: â° â Importar ZIP â selecione o arquivo"}</Step>
          <Step n={5}>{"â Projeto aparece com todos os arquivos prontos"}</Step>

          <Alert color="green">{"ð¡ Funciona com qualquer projeto: Node.js, Python, React, HTML â qualquer linguagem."}</Alert>

          <H2>{"ð MÃ©todo 2 â Via GitHub"}</H2>
          <Step n={1}>{"FaÃ§a push do projeto para o GitHub"}</Step>
          <Step n={2}>{"No DevMobile, abra o Terminal"}</Step>
          <Step n={3}>{"Digite: git clone https://github.com/SEU_USUARIO/SEU_REPO.git"}</Step>
          <Step n={4}>{"Ou use â° â GitHub â Clonar repositÃ³rio"}</Step>
        </View>
      )}

      {tab === "juntar" && (
        <View>
          <Alert color="blue">{"ð A ideia Ã© simples: vocÃª traz cada app para cÃ¡, identifica o que funciona em cada um, e a Jasmim une tudo num Ãºnico projeto â sem reescrever o que jÃ¡ funciona."}</Alert>

          <H2>{"ð Passo a passo para juntar vÃ¡rios apps"}</H2>
          <Step n={1}>{"Liste seus apps e o que cada um faz bem.\nEx: 'App 1 â login funciona. App 2 â relatÃ³rios. App 3 â chat.'"}</Step>
          <Step n={2}>{"Importe todos para o DevMobile (um por vez) via ZIP ou GitHub"}</Step>
          <Step n={3}>{"Abra a Jasmim (Ã­cone ð¤) no editor"}</Step>
          <Step n={4}>{"Diga exatamente quais partes funcionam e quais nÃ£o. Seja especÃ­fico."}</Step>
          <Step n={5}>{"PeÃ§a para a Jasmim unir:"}</Step>
          <Code copyKey="j-juntar">{"\"Tenho 3 projetos aqui. O login estÃ¡ em app1/, os relatÃ³rios em app2/ e o chat em app3/. Quero um Ãºnico projeto que use o login do app1, relatÃ³rios do app2 e chat do app3. NÃ£o reescreva â aproveite o cÃ³digo que jÃ¡ funciona.\""}</Code>
          <Step n={6}>{"Teste no terminal: npm install && npm start"}</Step>
          <Step n={7}>{"Para qualquer erro: 'Tem um erro no terminal, corrija sem reescrever o que estava funcionando.'"}</Step>

          <H2>{"ð¬ Mais exemplos para a Jasmim"}</H2>
          <H3>{"Juntar dois apps"}</H3>
          <Code copyKey="j-dois">{"\"Tenho dois projetos: app-login/ (o login funciona bem) e app-dashboard/ (os grÃ¡ficos funcionam bem). Una os dois num projeto sÃ³ chamado meu-app/. Reutilize o cÃ³digo existente.\""}</Code>

          <H3>{"Aproveitar partes especÃ­ficas"}</H3>
          <Code copyKey="j-partes">{"\"Do app1/ aproveite: auth/. Do app2/ aproveite: routes/reports.js. Do app3/ aproveite: components/Chat.jsx. Crie um Ãºnico projeto unindo essas partes.\""}</Code>

          <Alert color="yellow">{"â Sempre diga: 'nÃ£o reescreva o que jÃ¡ funciona, aproveite o cÃ³digo existente'. Com essa instruÃ§Ã£o, a Jasmim vai copiar e adaptar o que jÃ¡ estÃ¡ pronto â nÃ£o criar do zero."}</Alert>
        </View>
      )}

      {tab === "duplicar" && (
        <View>
          <P>{"Para criar uma cÃ³pia exata de um projeto jÃ¡ no DevMobile:"}</P>
          <Step n={1}>{"Abra o projeto que quer duplicar"}</Step>
          <Step n={2}>{"Toque em â° â Duplicar Projeto"}</Step>
          <Step n={3}>{"Confirme â o DevMobile cria uma cÃ³pia com '(cÃ³pia)' no nome"}</Step>
          <Step n={4}>{"O novo projeto jÃ¡ abre com todos os arquivos copiados"}</Step>

          <Alert color="green">{"â Isso cria um projeto completamente independente. AlteraÃ§Ãµes na cÃ³pia nÃ£o afetam o original."}</Alert>

          <H2>{"ð¤ Exportar e importar como backup"}</H2>
          <Step n={1}>{"Exporte o projeto: â° â Exportar ZIP"}</Step>
          <Step n={2}>{"Salve em local seguro (Google Drive, etc.)"}</Step>
          <Step n={3}>{"Para restaurar: â° â Importar ZIP"}</Step>

          <H2>{"â±ï¸ Checkpoints (snapshots)"}</H2>
          <P>{"Salve pontos de restauraÃ§Ã£o enquanto trabalha:"}</P>
          <Li>{"â° â Salvar Checkpoint â cria um snapshot do projeto"}</Li>
          <Li>{"â° â HistÃ³rico de Checkpoints â ver e restaurar versÃµes antigas"}</Li>
          <Li>{"Dica: salve antes de mudanÃ§as grandes!"}</Li>
        </View>
      )}

      {tab === "organizar" && (
        <View>
          <Alert color="green">{"ð§­ VocÃª tem vÃ¡rios apps e cada um funciona sÃ³ em parte. Aqui estÃ¡ o roteiro para se organizar."}</Alert>

          <H2>{"ð Etapa 1 â Mapear o que vocÃª tem"}</H2>
          <P>{"Para cada app, faÃ§a uma lista:"}</P>
          <Code copyKey="mapeamento">{"App 1 â Nome: ___________\nâ O que funciona: ___________\nâ O que nÃ£o funciona: ___________\n\nApp 2 â Nome: ___________\nâ O que funciona: ___________\nâ O que nÃ£o funciona: ___________\n\n(repita para cada app)"}</Code>

          <H2>{"ð¯ Etapa 2 â Definir o app final que vocÃª quer"}</H2>
          <P>{"Responda: qual seria o app perfeito se tudo funcionasse?"}</P>
          <Code copyKey="app-final">{"App Final \"Meu Sistema\":\n- Login de usuÃ¡rio â (jÃ¡ existe no App 1)\n- Painel de controle â (jÃ¡ existe no App 3)\n- RelatÃ³rios em PDF â (jÃ¡ existe no App 5)\n- Chat com IA â (jÃ¡ existe no App 7)\n- Pagamentos â (nÃ£o existe ainda)\n- NotificaÃ§Ãµes push â (nÃ£o existe ainda)"}</Code>

          <H2>{"ð Etapa 3 â Executar com a Jasmim"}</H2>
          <Step n={1}>{"Importe todos os apps para o DevMobile"}</Step>
          <Step n={2}>{"Cole o mapeamento para a Jasmim"}</Step>
          <Step n={3}>{"PeÃ§a: 'Crie o app final unindo as partes que funcionam e criando as que faltam'"}</Step>
          <Step n={4}>{"Teste cada funcionalidade no terminal"}</Step>
          <Step n={5}>{"Para erros: 'Corrija sem reescrever o que jÃ¡ estava funcionando'"}</Step>

          <Alert color="yellow">{"â¡ EstratÃ©gia: sempre faÃ§a a Jasmim trabalhar em partes. 'Junte primeiro o login e o painel. Depois adicione os relatÃ³rios. Depois o chat.' Uma funcionalidade por vez Ã© mais seguro."}</Alert>
        </View>
      )}
    </View>
  );
}
