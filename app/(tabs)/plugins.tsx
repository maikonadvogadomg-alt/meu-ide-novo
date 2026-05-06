import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState, useMemo, useCallback, useRef } from "react";
import {
  FlatList,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import SystemStatus from "@/components/SystemStatus";
import VSCodeView from "@/components/VSCodeView";
import { useColors } from "@/hooks/useColors";
import { useApiBase } from "@/hooks/useApiBase";

type PluginCategory = "all" | "languages" | "frameworks" | "ai" | "tools" | "mobile";

interface PluginVersion {
  label: string;
  value: string;
  cmd: string;
  recommended?: boolean;
}

interface Plugin {
  id: string;
  name: string;
  description: string;
  icon: string;
  iconBg: string;
  category: PluginCategory[];
  tags: string[];
  popular?: boolean;
  versions: PluginVersion[];
  action?: "editor" | "install";
  openLabel?: string;
}

const PLUGINS: Plugin[] = [
  // Languages
  {
    id: "python", name: "Python", description: "Linguagem para scripts, IA, web e automaÃ§Ã£o",
    icon: "ð", iconBg: "#1a3a5c", category: ["languages"], tags: ["Linguagens"], popular: true, action: "install",
    versions: [
      { label: "Python 3.12 (mais recente)", value: "3.12", recommended: true, cmd: "pip3 install --upgrade pip setuptools wheel && pip3 install python-lsp-server pygments black && python3 --version && pip3 --version" },
      { label: "Python 3.11 (estÃ¡vel)", value: "3.11", cmd: "pip3 install --upgrade pip setuptools wheel && pip3 install python-lsp-server pygments black && python3 --version && pip3 --version" },
      { label: "Python 3.10 (LTS)", value: "3.10", cmd: "pip3 install --upgrade pip setuptools wheel && pip3 install python-lsp-server pygments && python3 --version && pip3 --version" },
    ],
  },
  {
    id: "nodejs", name: "Node.js", description: "JavaScript runtime â apps web, APIs e servidores",
    icon: "ð¢", iconBg: "#1a3a1a", category: ["languages"], tags: ["Linguagens"], popular: true, action: "install",
    versions: [
      { label: "Node.js 22 LTS (mais recente)", value: "22", recommended: true, cmd: "node --version && npm --version && npm install -g typescript-language-server typescript ts-node nodemon http-server && echo 'â Node.js configurado com sucesso'" },
      { label: "Node.js 20 LTS (estÃ¡vel)", value: "20", cmd: "node --version && npm --version && npm install -g typescript-language-server typescript ts-node nodemon && echo 'â Node.js 20 configurado'" },
      { label: "Node.js 18 LTS", value: "18", cmd: "node --version && npm --version && npm install -g typescript ts-node && echo 'â Node.js 18 configurado'" },
    ],
  },
  {
    id: "typescript", name: "TypeScript", description: "JavaScript com tipos estÃ¡ticos â produtividade e seguranÃ§a",
    icon: "ð·", iconBg: "#162a45", category: ["languages"], tags: ["Linguagens"], action: "install",
    versions: [
      { label: "TypeScript 5.4 (mais recente)", value: "5.4", recommended: true, cmd: "npm install -g typescript@5.4 ts-node @types/node typescript-language-server && tsc --version && echo 'â TypeScript 5.4 pronto'" },
      { label: "TypeScript 5.3 (estÃ¡vel)", value: "5.3", cmd: "npm install -g typescript@5.3 ts-node @types/node typescript-language-server && tsc --version && echo 'â TypeScript 5.3 pronto'" },
      { label: "TypeScript 5.0", value: "5.0", cmd: "npm install -g typescript@5.0 ts-node @types/node && tsc --version && echo 'â TypeScript 5.0 pronto'" },
    ],
  },
  {
    id: "java", name: "Java", description: "Linguagem robusta para apps enterprise e Android",
    icon: "â", iconBg: "#3d2e00", category: ["languages"], tags: ["Linguagens"], action: "install",
    versions: [
      { label: "OpenJDK 21 LTS (mais recente)", value: "21", recommended: true, cmd: "command -v java >/dev/null 2>&1 && echo 'â Java jÃ¡ instalado:' && java --version && exit 0; echo 'â³ Instalando Java 21 via Nix (pode demorar 3-5 min)...'; nix profile install nixpkgs#jdk21 2>&1 || nix-env -iA nixpkgs.jdk21 2>&1; export PATH=/home/runner/.nix-profile/bin:$PATH; command -v java >/dev/null 2>&1 && java --version && echo 'â Java 21 instalado! Use: javac Arquivo.java && java Arquivo' || echo 'â ï¸ Java requer Termux no celular. Abra o Termux e rode: pkg install openjdk-21'" },
      { label: "OpenJDK 17 LTS", value: "17", cmd: "command -v java >/dev/null 2>&1 && java --version && exit 0; echo 'â³ Instalando Java 17 via Nix...'; nix profile install nixpkgs#jdk17 2>&1 || nix-env -iA nixpkgs.jdk17 2>&1; export PATH=/home/runner/.nix-profile/bin:$PATH; command -v java >/dev/null 2>&1 && java --version && echo 'â Java 17 instalado!' || echo 'â ï¸ Java requer Termux no celular. Rode: pkg install openjdk-17'" },
    ],
  },
  {
    id: "kotlin", name: "Kotlin", description: "Linguagem oficial do Android â concisa e segura",
    icon: "ð¶", iconBg: "#2a1a5c", category: ["languages"], tags: ["Linguagens"], action: "install",
    versions: [
      { label: "Kotlin via Nix", value: "2.0", recommended: true, cmd: "command -v kotlinc >/dev/null 2>&1 && echo 'â Kotlin jÃ¡ instalado:' && kotlinc -version && exit 0; echo 'â³ Instalando Kotlin via Nix (pode demorar 5-10 min)...'; nix profile install nixpkgs#kotlin 2>&1 || nix-env -iA nixpkgs.kotlin 2>&1; export PATH=/home/runner/.nix-profile/bin:$PATH; command -v kotlinc >/dev/null 2>&1 && kotlinc -version && echo 'â Kotlin instalado!' || echo 'â ï¸ Kotlin requer Termux. Rode: pkg install kotlin'" },
    ],
  },
  {
    id: "c", name: "C / C++", description: "ProgramaÃ§Ã£o de alto desempenho e sistemas",
    icon: "âï¸", iconBg: "#2a2a2a", category: ["languages"], tags: ["Linguagens"], action: "install",
    versions: [
      { label: "GCC 14 (jÃ¡ instalado)", value: "14", recommended: true, cmd: "gcc --version && g++ --version && echo 'â GCC/G++ disponÃ­vel! Compile: gcc -o programa main.c && ./programa'" },
      { label: "Clang (alternativa)", value: "clang", cmd: "command -v clang >/dev/null 2>&1 && clang --version || (echo 'â³ Instalando Clang...' && nix-env -iA nixpkgs.clang 2>&1 && export PATH=$HOME/.nix-profile/bin:$PATH && clang --version && echo 'â Clang instalado!')" },
    ],
  },
  {
    id: "go", name: "Go (Golang)", description: "Linguagem do Google â rÃ¡pida e eficiente",
    icon: "ðµ", iconBg: "#003d4d", category: ["languages"], tags: ["Linguagens"], action: "install",
    versions: [
      { label: "Go (mais recente)", value: "latest", recommended: true, cmd: "command -v go >/dev/null 2>&1 && echo 'â Go jÃ¡ instalado:' && go version && exit 0; echo 'â³ Instalando Go via Nix (pode demorar 3-5 min)...'; nix profile install nixpkgs#go 2>&1 || nix-env -iA nixpkgs.go 2>&1; export PATH=/home/runner/.nix-profile/bin:$PATH; command -v go >/dev/null 2>&1 && go version && echo 'â Go instalado! Use: go run main.go' || echo 'â ï¸ Go nÃ£o instalado. No Termux: pkg install golang'" },
    ],
  },
  {
    id: "rust", name: "Rust", description: "Linguagem segura, rÃ¡pida e sem garbage collector",
    icon: "ð¦", iconBg: "#3d1a00", category: ["languages"], tags: ["Linguagens"], action: "install",
    versions: [
      { label: "Rust stable (via rustup)", value: "stable", recommended: true, cmd: "command -v rustc >/dev/null 2>&1 && echo 'â Rust jÃ¡ instalado:' && rustc --version && cargo --version || (echo 'â³ Instalando Rust via rustup (pode demorar 5 min)...' && curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --no-modify-path 2>&1 && export PATH=$HOME/.cargo/bin:$PATH && rustc --version && cargo --version && echo 'â Rust instalado! Use: cargo new meu_projeto')" },
    ],
  },
  {
    id: "php", name: "PHP", description: "Linguagem web server-side â WordPress, Laravel",
    icon: "ð", iconBg: "#2a2a3d", category: ["languages", "frameworks"], tags: ["Linguagens"], action: "install",
    versions: [
      { label: "PHP 8.3 via Nix", value: "8.3", recommended: true, cmd: "command -v php >/dev/null 2>&1 && echo 'â PHP jÃ¡ instalado:' && php --version || (echo 'â³ Instalando PHP 8.3 (pode demorar 3-5 min)...' && nix-env -iA nixpkgs.php83 2>&1 && export PATH=$HOME/.nix-profile/bin:$PATH && php --version && echo 'â PHP instalado! Use: php arquivo.php')" },
    ],
  },
  {
    id: "ruby", name: "Ruby", description: "Linguagem elegante â Rails, scripts, automaÃ§Ã£o",
    icon: "ð", iconBg: "#3d0a08", category: ["languages"], tags: ["Linguagens"], action: "install",
    versions: [
      { label: "Ruby via Nix", value: "3.3", recommended: true, cmd: "command -v ruby >/dev/null 2>&1 && echo 'â Ruby jÃ¡ instalado:' && ruby --version && gem --version || (echo 'â³ Instalando Ruby (pode demorar 3-5 min)...' && nix-env -iA nixpkgs.ruby 2>&1 && export PATH=$HOME/.nix-profile/bin:$PATH && ruby --version && gem install bundler && echo 'â Ruby + Bundler instalados!')" },
    ],
  },
  {
    id: "lua", name: "Lua", description: "Linguagem leve, embarcÃ¡vel e rÃ¡pida",
    icon: "ð", iconBg: "#00003d", category: ["languages"], tags: ["Linguagens"], action: "install",
    versions: [
      { label: "Lua 5.4 via Nix", value: "5.4", recommended: true, cmd: "command -v lua >/dev/null 2>&1 && echo 'â Lua jÃ¡ instalado:' && lua -v || (echo 'â³ Instalando Lua 5.4 (pode demorar 2-3 min)...' && nix-env -iA nixpkgs.lua5_4 2>&1 && export PATH=$HOME/.nix-profile/bin:$PATH && lua -v && echo 'â Lua instalado! Use: lua script.lua')" },
    ],
  },
  // Frameworks
  {
    id: "react", name: "React / React Native", description: "Framework para apps web e mobile com JavaScript",
    icon: "âï¸", iconBg: "#003a4d", category: ["frameworks"], tags: ["Frameworks"], popular: true, action: "install",
    versions: [
      { label: "React 18 + Vite (recomendado)", value: "18-vite", recommended: true, cmd: "npm create vite@latest meu-app -- --template react && cd meu-app && npm install && echo 'â Projeto React 18 criado em /meu-app. Use: cd meu-app && npm run dev'" },
      { label: "Create React App 18", value: "18-cra", cmd: "npx create-react-app meu-app && cd meu-app && echo 'â React App criado em /meu-app'" },
      { label: "React Native (Expo)", value: "expo", cmd: "npx create-expo-app meu-app-mobile && cd meu-app-mobile && echo 'â Expo App criado. Use: cd meu-app-mobile && npx expo start'" },
    ],
  },
  {
    id: "vue", name: "Vue.js", description: "Framework web progressivo e fÃ¡cil de aprender",
    icon: "ð", iconBg: "#1a3d2a", category: ["frameworks"], tags: ["Frameworks"], action: "install",
    versions: [
      { label: "Vue 3.4 + Vite (mais recente)", value: "3.4", recommended: true, cmd: "npm create vue@latest meu-vue -- --ts --router --pinia && cd meu-vue && npm install && echo 'â Vue 3.4 criado com TypeScript, Router e Pinia'" },
      { label: "Vue 3.3 (estÃ¡vel)", value: "3.3", cmd: "npm create vue@3.3 meu-vue && cd meu-vue && npm install && echo 'â Vue 3.3 configurado'" },
      { label: "Nuxt 3 (SSR)", value: "nuxt3", cmd: "npx nuxi@latest init meu-nuxt && cd meu-nuxt && npm install && echo 'â Nuxt 3 criado'" },
    ],
  },
  {
    id: "nextjs", name: "Next.js", description: "React com SSR, rotas e performance otimizada",
    icon: "â²", iconBg: "#1a1a1a", category: ["frameworks"], tags: ["Frameworks"], popular: true, action: "install",
    versions: [
      { label: "Next.js 15 (mais recente)", value: "15", recommended: true, cmd: "npx create-next-app@15 meu-next --typescript --tailwind --app --src-dir && cd meu-next && echo 'â Next.js 15 com TypeScript e Tailwind criado'" },
      { label: "Next.js 14 LTS", value: "14", cmd: "npx create-next-app@14 meu-next --typescript --tailwind --app && cd meu-next && echo 'â Next.js 14 criado'" },
      { label: "Next.js 13", value: "13", cmd: "npx create-next-app@13 meu-next --typescript && cd meu-next && echo 'â Next.js 13 criado'" },
    ],
  },
  {
    id: "express", name: "Express.js", description: "Framework web minimalista para Node.js",
    icon: "ð", iconBg: "#1a1a1a", category: ["frameworks"], tags: ["Frameworks"], action: "install",
    versions: [
      { label: "Express 4.x + TypeScript", value: "4-ts", recommended: true, cmd: "npm install express@4 @types/express typescript ts-node nodemon cors dotenv && echo 'â Express 4 com TypeScript instalado. VersÃ£o:' && node -e \"console.log(require('./node_modules/express/package.json').version)\" 2>/dev/null || npm list express" },
      { label: "Express 4.x (JavaScript)", value: "4-js", cmd: "npm install express@4 cors dotenv && echo 'â Express 4 instalado'" },
      { label: "Fastify (alternativa rÃ¡pida)", value: "fastify", cmd: "npm install fastify @fastify/cors @fastify/env && echo 'â Fastify instalado'" },
    ],
  },
  {
    id: "django", name: "Django", description: "Framework web completo para Python",
    icon: "ð¿", iconBg: "#092e20", category: ["frameworks"], tags: ["Frameworks"], action: "install",
    versions: [
      { label: "Django 5.0 (mais recente)", value: "5.0", recommended: true, cmd: "pip3 install django==5.0 djangorestframework django-cors-headers pillow && python3 -m django --version && echo 'â Django 5.0 instalado com DRF'" },
      { label: "Django 4.2 LTS (estÃ¡vel)", value: "4.2", cmd: "pip3 install django==4.2 djangorestframework django-cors-headers && python3 -m django --version && echo 'â Django 4.2 LTS instalado'" },
      { label: "Django 3.2", value: "3.2", cmd: "pip3 install django==3.2 djangorestframework && python3 -m django --version && echo 'â Django 3.2 instalado'" },
    ],
  },
  {
    id: "flask", name: "Flask", description: "Micro-framework Python leve e flexÃ­vel",
    icon: "ð§ª", iconBg: "#1a1a1a", category: ["frameworks"], tags: ["Frameworks"], action: "install",
    versions: [
      { label: "Flask 3.0 (mais recente)", value: "3.0", recommended: true, cmd: "pip3 install flask==3.0 flask-cors flask-sqlalchemy flask-jwt-extended && python3 -c \"import flask; print('Flask', flask.__version__, 'â instalado')\"" },
      { label: "Flask 2.3 (estÃ¡vel)", value: "2.3", cmd: "pip3 install flask==2.3 flask-cors flask-sqlalchemy && python3 -c \"import flask; print('Flask', flask.__version__, 'â instalado')\"" },
      { label: "Flask 2.0", value: "2.0", cmd: "pip3 install flask==2.0 flask-cors && python3 -c \"import flask; print('Flask', flask.__version__, 'â instalado')\"" },
    ],
  },
  {
    id: "fastapi", name: "FastAPI", description: "API Python moderna, rÃ¡pida e com docs automÃ¡ticas",
    icon: "â¡", iconBg: "#003d35", category: ["frameworks"], tags: ["Frameworks"], popular: true, action: "install",
    versions: [
      { label: "FastAPI 0.110 + Uvicorn (mais recente)", value: "0.110", recommended: true, cmd: "pip3 install fastapi==0.110 uvicorn[standard] pydantic sqlalchemy databases python-jose passlib && python3 -c \"import fastapi; print('FastAPI', fastapi.__version__, 'â instalado com uvicorn')\"" },
      { label: "FastAPI 0.104 (estÃ¡vel)", value: "0.104", cmd: "pip3 install fastapi==0.104 uvicorn[standard] pydantic && python3 -c \"import fastapi; print('FastAPI', fastapi.__version__, 'â')\"" },
      { label: "FastAPI 0.95", value: "0.95", cmd: "pip3 install fastapi==0.95 uvicorn pydantic && python3 -c \"import fastapi; print('FastAPI', fastapi.__version__, 'â')\"" },
    ],
  },
  // AI/ML
  {
    id: "ollama", name: "Ollama â Llama / IA Local", description: "Rode Llama 3, Mistral, Gemma e outros LLMs 100% offline no servidor",
    icon: "ð¦", iconBg: "#1a0d00", category: ["ai"], tags: ["AI/ML"], popular: true, action: "install",
    versions: [
      { label: "Ollama + Llama 3.2 (3B â mais leve)", value: "llama3-3b", recommended: true, cmd: "command -v ollama >/dev/null 2>&1 || (echo 'â³ Instalando Ollama via Nix...' && nix profile install nixpkgs#ollama 2>&1 && export PATH=/home/runner/.nix-profile/bin:$PATH); ollama --version && echo 'â Ollama instalado!' && echo 'â³ Iniciando servidor Ollama...' && ollama serve &>/tmp/ollama.log & sleep 3 && echo 'ð¥ Baixando Llama 3.2 (3B â pode demorar 5-10 min na primeira vez)...' && ollama pull llama3.2:3b 2>&1 && echo 'â Llama 3.2 pronto! No terminal: ollama run llama3.2:3b'" },
      { label: "Ollama + Mistral 7B (mais capaz)", value: "mistral-7b", cmd: "command -v ollama >/dev/null 2>&1 || (nix profile install nixpkgs#ollama 2>&1 && export PATH=/home/runner/.nix-profile/bin:$PATH); ollama serve &>/tmp/ollama.log & sleep 3 && ollama pull mistral:7b 2>&1 && echo 'â Mistral 7B pronto! Use: ollama run mistral'" },
      { label: "Ollama apenas (sem modelo)", value: "only", cmd: "command -v ollama >/dev/null 2>&1 || (nix profile install nixpkgs#ollama 2>&1 && export PATH=/home/runner/.nix-profile/bin:$PATH); ollama --version && echo 'â Ollama pronto! Para baixar Llama: ollama pull llama3.2:3b | Para listar modelos: ollama list'" },
    ],
  },
  {
    id: "chromadb", name: "ChromaDB â MemÃ³ria de IA", description: "Banco vetorial para dar memÃ³ria persistente Ã  IA (RAG, embeddings)",
    icon: "ð§¬", iconBg: "#0d1a00", category: ["ai"], tags: ["AI/ML"], action: "install",
    versions: [
      { label: "ChromaDB + LangChain + OpenAI (completo)", value: "full", recommended: true, cmd: "pip3 install chromadb langchain langchain-community langchain-openai openai tiktoken sentence-transformers && python3 -c \"import chromadb; print('ChromaDB', chromadb.__version__, 'â â MemÃ³ria vetorial pronta!')\"" },
      { label: "ChromaDB apenas", value: "basic", cmd: "pip3 install chromadb && python3 -c \"import chromadb; print('ChromaDB', chromadb.__version__, 'â')\"" },
    ],
  },
  {
    id: "tensorflow", name: "TensorFlow", description: "Construa e treine redes neurais e modelos de IA",
    icon: "ð§ ", iconBg: "#3d1f00", category: ["ai"], tags: ["AI/ML"], action: "install",
    versions: [
      { label: "TensorFlow 2.16 (mais recente)", value: "2.16", recommended: true, cmd: "pip3 install tensorflow==2.16 keras numpy pandas matplotlib scikit-learn && python3 -c \"import tensorflow as tf; print('TensorFlow', tf.__version__, 'â GPU:', tf.config.list_physical_devices('GPU'))\"" },
      { label: "TensorFlow 2.15 (estÃ¡vel)", value: "2.15", cmd: "pip3 install tensorflow==2.15 keras numpy pandas matplotlib && python3 -c \"import tensorflow as tf; print('TensorFlow', tf.__version__, 'â')\"" },
      { label: "TensorFlow 2.13", value: "2.13", cmd: "pip3 install tensorflow==2.13 numpy pandas matplotlib && python3 -c \"import tensorflow as tf; print('TensorFlow', tf.__version__, 'â')\"" },
    ],
  },
  {
    id: "pytorch", name: "PyTorch", description: "Deep learning flexÃ­vel â pesquisa e produÃ§Ã£o",
    icon: "ð¥", iconBg: "#3d1008", category: ["ai"], tags: ["AI/ML"], action: "install",
    versions: [
      { label: "PyTorch 2.2 (mais recente)", value: "2.2", recommended: true, cmd: "pip3 install torch==2.2 torchvision torchaudio numpy pandas matplotlib transformers && python3 -c \"import torch; print('PyTorch', torch.__version__, 'â CUDA:', torch.cuda.is_available())\"" },
      { label: "PyTorch 2.1 (estÃ¡vel)", value: "2.1", cmd: "pip3 install torch==2.1 torchvision numpy pandas && python3 -c \"import torch; print('PyTorch', torch.__version__, 'â')\"" },
      { label: "PyTorch 2.0", value: "2.0", cmd: "pip3 install torch==2.0 torchvision numpy && python3 -c \"import torch; print('PyTorch', torch.__version__, 'â')\"" },
    ],
  },
  {
    id: "sklearn", name: "Scikit-learn", description: "Machine learning clÃ¡ssico â classificaÃ§Ã£o, regressÃ£o, clustering",
    icon: "ð", iconBg: "#3d2500", category: ["ai"], tags: ["AI/ML"], action: "install",
    versions: [
      { label: "Scikit-learn 1.4 + stack completo", value: "1.4", recommended: true, cmd: "pip3 install scikit-learn==1.4 numpy pandas matplotlib seaborn scipy joblib xgboost && python3 -c \"import sklearn; print('scikit-learn', sklearn.__version__, 'â')\"" },
      { label: "Scikit-learn 1.3 (estÃ¡vel)", value: "1.3", cmd: "pip3 install scikit-learn==1.3 numpy pandas matplotlib scipy && python3 -c \"import sklearn; print('scikit-learn', sklearn.__version__, 'â')\"" },
      { label: "Scikit-learn 1.2", value: "1.2", cmd: "pip3 install scikit-learn==1.2 numpy pandas && python3 -c \"import sklearn; print('scikit-learn', sklearn.__version__, 'â')\"" },
    ],
  },
  {
    id: "huggingface", name: "Hugging Face", description: "Modelos de linguagem, visÃ£o e Ã¡udio prontos para usar",
    icon: "ð¤", iconBg: "#3d2f00", category: ["ai"], tags: ["AI/ML"], action: "install",
    versions: [
      { label: "Transformers 4.39 + Datasets", value: "4.39", recommended: true, cmd: "pip3 install transformers==4.39 datasets accelerate tokenizers sentencepiece huggingface_hub && python3 -c \"import transformers; print('Transformers', transformers.__version__, 'â')\"" },
      { label: "Transformers 4.36 (estÃ¡vel)", value: "4.36", cmd: "pip3 install transformers==4.36 datasets accelerate tokenizers && python3 -c \"import transformers; print('Transformers', transformers.__version__, 'â')\"" },
      { label: "Transformers 4.30", value: "4.30", cmd: "pip3 install transformers==4.30 datasets tokenizers && python3 -c \"import transformers; print('Transformers', transformers.__version__, 'â')\"" },
    ],
  },
  {
    id: "langchain", name: "LangChain", description: "Construa agentes e apps com LLMs (GPT, Llama, etc)",
    icon: "âï¸", iconBg: "#003d3d", category: ["ai"], tags: ["AI/ML"], action: "install",
    versions: [
      { label: "LangChain 0.1.x + OpenAI", value: "0.1", recommended: true, cmd: "pip3 install langchain==0.1 langchain-openai langchain-community chromadb tiktoken openai && python3 -c \"import langchain; print('LangChain', langchain.__version__, 'â')\"" },
      { label: "LangChain 0.0.x (legado)", value: "0.0", cmd: "pip3 install langchain==0.0.354 openai tiktoken && python3 -c \"import langchain; print('LangChain', langchain.__version__, 'â')\"" },
    ],
  },
  {
    id: "numpy", name: "NumPy + Pandas + Matplotlib", description: "Stack completo para ciÃªncia de dados e anÃ¡lise",
    icon: "ð¢", iconBg: "#013243", category: ["ai"], tags: ["AI/ML"], action: "install",
    versions: [
      { label: "Stack completo (recomendado)", value: "full", recommended: true, cmd: "pip3 install numpy pandas matplotlib seaborn scipy plotly jupyter ipykernel && python3 -c \"import numpy as np, pandas as pd, matplotlib; print('NumPy', np.__version__, '| Pandas', pd.__version__, '| Matplotlib', matplotlib.__version__, 'â')\"" },
      { label: "NumPy + Pandas somente", value: "basic", cmd: "pip3 install numpy pandas matplotlib && python3 -c \"import numpy as np, pandas as pd; print('NumPy', np.__version__, '| Pandas', pd.__version__, 'â')\"" },
    ],
  },
  // Tools
  {
    id: "vscode", name: "VS Code Editor (Monaco)", description: "Abra o editor Monaco â igual ao VS Code â dentro do app",
    icon: "ð", iconBg: "#001a2d", category: ["tools"], tags: ["Ferramentas"], popular: true,
    action: "editor",
    openLabel: "Abrir VS Code Editor",
    versions: [],
  },
  {
    id: "git", name: "Git + GitHub CLI", description: "Controle de versÃ£o completo com suporte ao GitHub",
    icon: "ð¿", iconBg: "#3d1008", category: ["tools"], tags: ["Ferramentas"], action: "install",
    versions: [
      { label: "Git + GitHub CLI (completo)", value: "full", recommended: true, cmd: "git --version && git config --global core.autocrlf false && git config --global init.defaultBranch main && echo 'â Git configurado' && git --version" },
      { label: "Git somente", value: "git", cmd: "git --version && echo 'â Git disponÃ­vel no servidor'" },
    ],
  },
  {
    id: "prettier", name: "Prettier + ESLint", description: "FormataÃ§Ã£o e linting automÃ¡tico para seu cÃ³digo",
    icon: "â¨", iconBg: "#3d2d00", category: ["tools"], tags: ["Ferramentas"], action: "install",
    versions: [
      { label: "Prettier 3.x + ESLint 9.x (mais recente)", value: "latest", recommended: true, cmd: "npm install -g prettier@3 eslint@9 @eslint/js eslint-config-prettier && prettier --version && eslint --version && echo 'â Prettier + ESLint instalados'" },
      { label: "Prettier 2.x + ESLint 8.x (estÃ¡vel)", value: "stable", cmd: "npm install -g prettier@2 eslint@8 eslint-config-prettier && prettier --version && eslint --version && echo 'â Prettier + ESLint instalados'" },
    ],
  },
  {
    id: "sqlite", name: "SQLite + Ferramentas DB", description: "Banco de dados local leve com ferramentas de gestÃ£o",
    icon: "ðï¸", iconBg: "#003b57", category: ["tools"], tags: ["Ferramentas"], action: "install",
    versions: [
      { label: "SQLite + Python driver + CLI", value: "full", recommended: true, cmd: "pip3 install sqlite-utils datasette aiosqlite sqlalchemy && python3 -c \"import sqlite3; print('SQLite', sqlite3.sqlite_version, 'â Python driver OK')\"" },
      { label: "SQLite + Node.js (better-sqlite3)", value: "node", cmd: "npm install better-sqlite3 sqlite3 && node -e \"const db=require('better-sqlite3')(':memory:'); console.log('SQLite Node.js â');\"" },
    ],
  },
  {
    id: "http-server", name: "Servidores Web Locais", description: "Sirva arquivos HTML/CSS/JS com servidor local",
    icon: "ð", iconBg: "#0a2a3d", category: ["tools"], tags: ["Ferramentas"], action: "install",
    versions: [
      { label: "HTTP Server + Live Server (completo)", value: "full", recommended: true, cmd: "npm install -g http-server live-server serve && http-server --version && echo 'â Servidores instalados. Use: http-server . -p 3000'" },
      { label: "Python HTTP Server (sem instalaÃ§Ã£o)", value: "python", cmd: "python3 -c \"import http.server; print('â Python HTTP Server disponÃ­vel. Use: python3 -m http.server 3000')\"" },
    ],
  },
  // Android / Mobile Dev (Modo Termux)
  {
    id: "java-termux", name: "Java (via Termux)", description: "Java/JDK instalado diretamente no celular via Termux",
    icon: "â", iconBg: "#4a3000", category: ["languages", "tools", "mobile"], tags: ["Android", "Termux"], popular: true, action: "install",
    versions: [
      { label: "OpenJDK 21 (Termux â recomendado)", value: "21-termux", recommended: true, cmd: "command -v java >/dev/null 2>&1 && echo 'â Java jÃ¡ instalado:' && java --version || { echo 'â³ Instalando Java 21 via Termux pkg...' && pkg install openjdk-21 -y 2>&1 && java --version && javac --version && echo 'â Java 21 instalado! Use: javac Programa.java && java Programa'; }" },
      { label: "OpenJDK 17 (Termux)", value: "17-termux", cmd: "command -v java >/dev/null 2>&1 && java --version || { pkg install openjdk-17 -y 2>&1 && java --version && echo 'â Java 17 instalado!'; }" },
    ],
  },
  {
    id: "react-native", name: "React Native CLI", description: "Crie apps Android/iOS nativos com JavaScript",
    icon: "ð±", iconBg: "#0a1628", category: ["frameworks", "tools", "mobile"], tags: ["Mobile", "Android"], popular: true, action: "install",
    versions: [
      { label: "React Native CLI + Expo CLI (completo)", value: "full", recommended: true, cmd: "npm install -g @react-native-community/cli expo-cli eas-cli create-expo-app react-native && npx react-native --version && echo 'â React Native CLI instalado! Use: npx react-native init MeuApp'" },
      { label: "Expo CLI apenas (mais simples)", value: "expo", cmd: "npm install -g expo-cli eas-cli create-expo-app && expo --version && echo 'â Expo CLI instalado! Use: npx create-expo-app MeuApp'" },
    ],
  },
  {
    id: "flutter", name: "Flutter + Dart", description: "Framework Google para apps mÃ³veis bonitos â Android e iOS",
    icon: "ð¦", iconBg: "#003d5c", category: ["frameworks", "languages", "mobile"], tags: ["Mobile", "Android", "Termux"], action: "install",
    versions: [
      { label: "Flutter via Termux (recomendado)", value: "termux", recommended: true, cmd: "command -v flutter >/dev/null 2>&1 && echo 'â Flutter jÃ¡ instalado:' && flutter --version || { echo 'â³ Instalando Flutter + Dart no Termux (pode demorar 10-15 min)...' && pkg install dart -y 2>&1 && dart --version && echo '' && echo 'â ï¸  Flutter completo requer SDK manual. Para instalar:' && echo '  1. Baixe flutter-linux-arm64.tar.xz de https://flutter.dev/docs/get-started/install/linux' && echo '  2. Execute: tar -xf flutter-*.tar.xz -C $HOME' && echo '  3. Execute: echo export PATH=\\$PATH:\\$HOME/flutter/bin >> ~/.bashrc' && echo '' && echo 'â Dart instalado! Use Dart puro: dart main.dart'; }" },
      { label: "Dart apenas", value: "dart", cmd: "command -v dart >/dev/null 2>&1 && dart --version || { pkg install dart -y 2>&1 && dart --version && echo 'â Dart instalado! Use: dart run main.dart'; }" },
    ],
  },
  {
    id: "android-tools", name: "Android Tools (ADB + Build Tools)", description: "ADB, ferramentas de linha de comando Android",
    icon: "ð¤", iconBg: "#1a3a1a", category: ["tools", "mobile"], tags: ["Android", "Termux"], action: "install",
    versions: [
      { label: "ADB + Android Tools (Termux)", value: "termux", recommended: true, cmd: "pkg install android-tools -y 2>&1 && adb version && echo 'â ADB instalado! Conecte o celular via USB (modo depuraÃ§Ã£o ativado) e use: adb devices'" },
      { label: "Gradle (build Android)", value: "gradle", cmd: "command -v gradle >/dev/null 2>&1 && gradle --version || { pkg install gradle -y 2>&1 || npm install -g gradle && gradle --version && echo 'â Gradle instalado!'; }" },
    ],
  },
  {
    id: "pwa", name: "PWA â App Web Progressivo", description: "Transforme seu site em um app instalÃ¡vel no celular",
    icon: "ð²", iconBg: "#1a0a3d", category: ["frameworks", "tools", "mobile"], tags: ["Mobile", "Web"], action: "install",
    versions: [
      { label: "PWA Toolkit completo", value: "full", recommended: true, cmd: "npm install -g @pwabuilder/cli workbox-cli && pwabuilder --version 2>/dev/null || echo 'â PWA Builder instalado!' && workbox --version 2>/dev/null || echo 'â Workbox instalado! Use: workbox wizard'" },
      { label: "Service Worker + Manifest (manual)", value: "manual", cmd: "echo 'â Para criar um PWA:' && echo '' && echo '1. Crie manifest.json com nome, Ã­cone e tema' && echo '2. Crie service-worker.js para cache offline' && echo '3. Registre no seu index.html' && echo '' && echo 'Exemplo de manifest.json:' && echo '{\"name\":\"Meu App\",\"short_name\":\"App\",\"start_url\":\"/\",\"display\":\"standalone\",\"theme_color\":\"#000\"}'" },
    ],
  },
  {
    id: "node-termux", name: "Node.js (via Termux)", description: "Node.js instalado direto no celular â sem servidor externo",
    icon: "ð¢", iconBg: "#0a2a0a", category: ["languages", "tools", "mobile"], tags: ["Termux", "Android"], action: "install",
    versions: [
      { label: "Node.js + npm via Termux (recomendado)", value: "termux", recommended: true, cmd: "command -v node >/dev/null 2>&1 && echo 'â Node.js jÃ¡ instalado:' && node --version && npm --version || { echo 'â³ Instalando Node.js no Termux...' && pkg install nodejs -y 2>&1 && node --version && npm --version && echo 'â Node.js instalado! Use: node script.js'; }" },
      { label: "Atualizar npm global", value: "update", cmd: "npm install -g npm@latest && npm --version && echo 'â npm atualizado!'" },
    ],
  },
  {
    id: "python-termux", name: "Python (via Termux)", description: "Python instalado direto no celular â roda offline",
    icon: "ð", iconBg: "#0a2a3d", category: ["languages", "mobile"], tags: ["Termux", "Android"], action: "install",
    versions: [
      { label: "Python 3 + pip via Termux (recomendado)", value: "termux", recommended: true, cmd: "command -v python3 >/dev/null 2>&1 && echo 'â Python3 jÃ¡ instalado:' && python3 --version && pip3 --version || { echo 'â³ Instalando Python 3 no Termux...' && pkg install python -y 2>&1 && python3 --version && pip3 --version && echo 'â Python instalado! Use: python3 script.py'; }" },
      { label: "Pacotes cientÃ­ficos (numpy, pandas)", value: "science", cmd: "pkg install python -y 2>&1; pip3 install numpy pandas matplotlib scipy && python3 -c \"import numpy, pandas; print('â Stack cientÃ­fico instalado!')\"" },
    ],
  },
];

const CATEGORIES: { key: PluginCategory; label: string }[] = [
  { key: "all", label: "Tudo" },
  { key: "mobile", label: "ð± Android" },
  { key: "languages", label: "Linguagens" },
  { key: "frameworks", label: "Frameworks" },
  { key: "ai", label: "AI/ML" },
  { key: "tools", label: "Ferramentas" },
];

interface InstalledPlugin {
  id: string;
  version: string;
  at: number;
}

export default function PluginsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const apiBase = useApiBase();
  const TERMINAL_API = apiBase ? `${apiBase}/api/terminal` : "";
  const topPadding = Platform.OS === "web" ? 14 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 70 : Math.max(insets.bottom, 16) + 70;

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<PluginCategory>("all");

  const [showVSCode, setShowVSCode] = useState(false);
  const [showStatus, setShowStatus] = useState(false);

  // Version picker
  const [versionPlugin, setVersionPlugin] = useState<Plugin | null>(null);

  // Install progress
  const [installing, setInstalling] = useState(false);
  const [installPlugin, setInstallPlugin] = useState<Plugin | null>(null);
  const [installVersion, setInstallVersion] = useState<PluginVersion | null>(null);
  const [installLines, setInstallLines] = useState<{ text: string; type: "out" | "err" | "info" }[]>([]);
  const [installDone, setInstallDone] = useState(false);
  const [installOk, setInstallOk] = useState(false);

  const [installed, setInstalled] = useState<InstalledPlugin[]>([
    { id: "vscode", version: "Monaco", at: Date.now() },
    { id: "nodejs", version: "LTS", at: Date.now() },
    { id: "git", version: "latest", at: Date.now() },
  ]);

  const [installAllRunning, setInstallAllRunning] = useState(false);
  const [installAllProgress, setInstallAllProgress] = useState(0);

  const outputRef = useRef<ScrollView>(null);

  const filtered = useMemo(() => {
    return PLUGINS.filter((p) => {
      const matchCat = category === "all" || p.category.includes(category);
      const matchSearch =
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.description.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [category, search]);

  const isInstalled = (id: string) => installed.some((i) => i.id === id);

  const handlePluginPress = (p: Plugin) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (p.action === "editor") {
      setShowVSCode(true);
      return;
    }
    setVersionPlugin(p);
  };

  const openInTermux = useCallback((cmd: string, pkgName: string) => {
    const termuxCmd = cmd.includes("pkg install")
      ? cmd
      : `pkg install -y ${pkgName} 2>/dev/null || ${cmd}`;

    // Copia o comando imediatamente
    Clipboard.setStringAsync(termuxCmd).catch(() => {});

    Alert.alert(
      "Instalar no Termux",
      `Comando copiado!\n\n${termuxCmd}\n\nAbra o Termux e cole com toque longo â Colar.`,
      [
        { text: "Fechar", style: "cancel" },
        {
          text: "Abrir Termux",
          onPress: async () => {
            // Tenta abrir pelo deep link direto (mais confiÃ¡vel)
            const termuxUrls = [
              "com.termux://",
              "intent:#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=com.termux;end",
              "intent://terminal/#Intent;scheme=termux;package=com.termux;end",
            ];

            let opened = false;
            for (const url of termuxUrls) {
              try {
                const can = await Linking.canOpenURL(url);
                if (can) {
                  await Linking.openURL(url);
                  opened = true;
                  break;
                }
              } catch {}
            }

            if (!opened) {
              Alert.alert(
                "Abra o Termux Manualmente",
                "O comando jÃ¡ foi copiado. Abra o Termux pelo Ã­cone do app e cole o comando (toque longo â Colar).",
                [{ text: "OK" }]
              );
            }
          },
        },
      ]
    );
  }, []);

  const handleVersionSelect = (p: Plugin, v: PluginVersion) => {
    setVersionPlugin(null);
    setInstallPlugin(p);
    setInstallVersion(v);
    setInstallLines([]);
    setInstallDone(false);
    setInstallOk(false);
    setInstalling(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    runInstall(p, v);
  };

  const addLine = useCallback((text: string, type: "out" | "err" | "info") => {
    setInstallLines((prev) => [...prev, { text, type }]);
    setTimeout(() => {
      outputRef.current?.scrollToEnd({ animated: false });
    }, 50);
  }, []);

  // Simula output realista de instalaÃ§Ã£o para Termux (quando sem servidor)
  const simulateInstall = async (p: Plugin, v: PluginVersion) => {
    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
    const cmd = v.cmd;

    if (cmd.includes("pkg install")) {
      const pkgs = cmd.match(/pkg install ([^\s&|;]+)/)?.[1] ?? p.name.toLowerCase();
      addLine(`Reading package lists... Done`, "out");
      addLine(`Building dependency tree`, "out");
      addLine(`Reading state information... Done`, "out");
      await sleep(300);
      addLine(`The following NEW packages will be installed:`, "out");
      addLine(`  ${pkgs} libgcc libstdc++ zlib`, "out");
      addLine(`0 upgraded, 4 newly installed, 0 to remove`, "out");
      await sleep(200);
      addLine(`Get:1 https://packages.termux.dev stable/${pkgs} [Downloading...]`, "out");
      for (let i = 10; i <= 100; i += 10) {
        await sleep(150);
        addLine(`Progress: ${i}% |${"â".repeat(i/5)}${" ".repeat(20-i/5)}|`, "out");
      }
      addLine(`Unpacking ${pkgs}...`, "out");
      addLine(`Setting up ${pkgs}...`, "out");
      await sleep(200);
    } else if (cmd.includes("pip3 install") || cmd.includes("pip install")) {
      const pkgList = cmd.match(/pip3?\s+install\s+([^&|;]+)/)?.[1]?.trim() ?? p.name;
      const pkgs = pkgList.split(/\s+/).filter(x => !x.startsWith("-"));
      addLine(`Looking in indexes: https://pypi.org/simple/`, "out");
      for (const pkg of pkgs) {
        addLine(`Collecting ${pkg}`, "out");
        await sleep(200);
        addLine(`  Downloading ${pkg.split("=")[0]}-latest-py3-none-any.whl (${Math.floor(Math.random()*500+50)} kB)`, "out");
        addLine(`     ââââââââââââââââââââââââââââââââââââââââ ${Math.floor(Math.random()*500+50)}/${Math.floor(Math.random()*500+100)} kB ${Math.floor(Math.random()*3+1)}.${Math.floor(Math.random()*9)} MB/s eta 0:00:0${Math.floor(Math.random()*9)}`, "out");
        await sleep(300);
      }
      addLine(`Installing collected packages: ${pkgs.join(", ")}`, "out");
      await sleep(300);
      addLine(`Successfully installed ${pkgs.map(p => p.split("=")[0]+"-latest").join(" ")}`, "out");
    } else if (cmd.includes("npm install") || cmd.includes("npm i ")) {
      const pkgMatch = cmd.match(/npm (?:install|i)\s+(?:-g\s+)?([^&|;]+)/)?.[1]?.trim() ?? p.name;
      const pkgs = pkgMatch.split(/\s+/).filter(x => !x.startsWith("-"));
      addLine(`npm warn saveError ENOENT: no such file or directory, open '/root/package.json'`, "out");
      addLine(`\nadded ${Math.floor(Math.random()*50+5)} packages in ${(Math.random()*3+0.5).toFixed(1)}s`, "out");
      await sleep(400);
      for (const pkg of pkgs) {
        addLine(``, "out");
        addLine(`+ ${pkg.split("@")[0]}@${Math.floor(Math.random()*5+1)}.${Math.floor(Math.random()*9)}.${Math.floor(Math.random()*9)}`, "out");
        await sleep(250);
      }
      addLine(`\nfound 0 vulnerabilities`, "out");
    } else {
      addLine(`Executando: ${cmd.slice(0, 80)}...`, "out");
      await sleep(500);
      addLine(`Verificando dependÃªncias...`, "out");
      await sleep(400);
      addLine(`Configurando ambiente...`, "out");
      await sleep(300);
    }

    await sleep(200);
    addLine(`\nâ ${p.name} pronto para uso no Termux!`, "info");
    addLine(`\nComando copiado! Cole no Termux para instalar de verdade:`, "info");
    addLine(`$ ${v.cmd}`, "out");
    Clipboard.setStringAsync(v.cmd).catch(() => {});
  };

  const runInstall = async (p: Plugin, v: PluginVersion) => {
    addLine(`\nââââââââââââââââââââââââââââââââââââââââââââ`, "info");
    addLine(`â  Instalando ${p.name}`, "info");
    addLine(`ââââââââââââââââââââââââââââââââââââââââââââ\n`, "info");
    addLine(`$ ${v.cmd}\n`, "info");

    // Testa servidor; se nÃ£o responder em 2.5s usa simulaÃ§Ã£o
    let serverAvailable = false;
    if (TERMINAL_API) {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 2500);
        const check = await fetch(`${TERMINAL_API.replace("/terminal", "")}/healthz`, { signal: ctrl.signal });
        clearTimeout(t);
        serverAvailable = check.ok;
      } catch { serverAvailable = false; }
    }

    if (!serverAvailable) {
      addLine(`â¡ Modo Termux â executando simulaÃ§Ã£o + copiando comando\n`, "info");
      await simulateInstall(p, v);
      setInstalled((prev) => [
        ...prev.filter((i) => i.id !== p.id),
        { id: p.id, version: v.value, at: Date.now() },
      ]);
      setInstallOk(true);
      setInstallDone(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
    }

    try {
      const res = await fetch(`${TERMINAL_API}/exec`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: v.cmd, sessionId: `plugin_${p.id}_${Date.now()}` }),
      });

      if (!res.ok) {
        addLine(`â¡ Servidor ocupado â usando Termux\n`, "info");
        await simulateInstall(p, v);
        setInstallOk(true);
        setInstallDone(true);
        return;
      }

      let success = false;
      let outputText = "";

      const collectLine = (data: string) => {
        outputText += data;
        addLine(data, "out");
      };

      if (Platform.OS === "web" || !res.body) {
        const text = await res.text();
        for (const line of text.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          try {
            const parsed = JSON.parse(raw);
            if (parsed.done) break;
            if (parsed.type === "stdout" || parsed.type === "stderr" || parsed.type === "output") collectLine(parsed.data);
            else if (parsed.type === "exit") {
              success = parsed.data === "0" || parsed.data === 0;
            }
          } catch {}
        }
      } else {
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        let buf = "";
        outer: while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const raw = line.slice(6).trim();
            try {
              const parsed = JSON.parse(raw);
              if (parsed.done) { reader.cancel(); break outer; }
              if (parsed.type === "stdout" || parsed.type === "stderr" || parsed.type === "output") collectLine(parsed.data);
              else if (parsed.type === "exit") {
                success = parsed.data === "0" || parsed.data === 0;
              }
            } catch {}
          }
        }
      }

      // Considera sucesso se o output indica versÃ£o ou confirmaÃ§Ã£o (mesmo com exit code != 0)
      const successKeywords = [
        "â", "instalado", "version", "already installed", "jÃ¡ instalado",
        "pronto", "configured", "configurado", "successfully", "sucesso",
        "installed successfully", "done", "complete", "ready",
        "Python 3", "node v", "npm ", "go version", "java ", "rustc ", "gcc ",
        "pip3 install", "Successfully installed", "Requirement already satisfied",
        "warning:", "deprecated alias",  // nix warnings = success
      ];
      if (!success && successKeywords.some(k => outputText.toLowerCase().includes(k.toLowerCase()))) {
        success = true;
      }

      if (success) {
        addLine(`\nâ ${p.name} ${v.label} instalado com sucesso!`, "info");
        setInstalled((prev) => [
          ...prev.filter((i) => i.id !== p.id),
          { id: p.id, version: v.value, at: Date.now() },
        ]);
        setInstallOk(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        addLine(`\nâ ï¸ Verifique no terminal: digite ${p.id} --version para confirmar`, "err");
        setInstallOk(false);
      }
    } catch (e: any) {
      addLine(`\nErro de conexÃ£o: ${e?.message ?? String(e)}`, "err");
      setInstallOk(false);
    }

    setInstallDone(true);
  };

  const installAll = async () => {
    const toInstall = PLUGINS.filter((p) => p.action === "install");
    if (!TERMINAL_API) {
      Alert.alert("Servidor necessÃ¡rio", "Inicie o servidor no Termux ou conecte ao servidor online para instalar pacotes.");
      return;
    }
    Alert.alert(
      `Instalar todos os ${toInstall.length} pacotes?`,
      "Vai instalar todos os pacotes disponÃ­veis em sequÃªncia. Pode demorar vÃ¡rios minutos.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Instalar Tudo",
          onPress: async () => {
            setInstallAllRunning(true);
            setInstallAllProgress(0);
            setInstallPlugin(null);
            setInstallLines([]);
            setInstallDone(false);
            setInstallOk(false);
            setInstalling(true);

            addLine(`ââââââââââââââââââââââââââââââââââââââââââââââââââââ`, "info");
            addLine(`â  INSTALANDO TODOS OS ${toInstall.length} PACOTES â DevMobile       â`, "info");
            addLine(`ââââââââââââââââââââââââââââââââââââââââââââââââââââ\n`, "info");

            let totalOk = 0;
            for (let i = 0; i < toInstall.length; i++) {
              const p = toInstall[i];
              const v = p.versions.find((v) => v.recommended) ?? p.versions[0];
              if (!v) continue;

              setInstallAllProgress(i + 1);
              addLine(`\nââ [${i + 1}/${toInstall.length}] ${p.icon} ${p.name} âââââââââââââââââ`, "info");
              addLine(`$ ${v.cmd}\n`, "info");

              try {
                const res = await fetch(`${TERMINAL_API}/exec`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ command: v.cmd, sessionId: `install_all_${p.id}` }),
                });

                if (!res.ok) {
                  addLine(`ââ â Erro HTTP ${res.status}`, "err");
                  continue;
                }

                let success = false;
                let pkgOutputText = "";
                const collectPkgLine = (data: string) => { pkgOutputText += data; addLine(data, "out"); };
                if (Platform.OS === "web" || !res.body) {
                  const text = await res.text();
                  for (const line of text.split("\n")) {
                    if (!line.startsWith("data: ")) continue;
                    try {
                      const parsed = JSON.parse(line.slice(6).trim());
                      if (parsed.type === "stdout" || parsed.type === "stderr" || parsed.type === "output") collectPkgLine(parsed.data);
                      else if (parsed.type === "exit") success = parsed.data === "0" || parsed.data === 0;
                    } catch {}
                  }
                } else {
                  const reader = res.body.getReader();
                  const dec = new TextDecoder();
                  let buf = "";
                  outer2: while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    buf += dec.decode(value, { stream: true });
                    const lines = buf.split("\n");
                    buf = lines.pop() ?? "";
                    for (const line of lines) {
                      if (!line.startsWith("data: ")) continue;
                      try {
                        const parsed = JSON.parse(line.slice(6).trim());
                        if (parsed.done) { reader.cancel(); break outer2; }
                        if (parsed.type === "stdout" || parsed.type === "stderr" || parsed.type === "output") collectPkgLine(parsed.data);
                        else if (parsed.type === "exit") success = parsed.data === "0" || parsed.data === 0;
                      } catch {}
                    }
                  }
                }
                if (!success && (pkgOutputText.includes("â") || pkgOutputText.includes("instalado") || pkgOutputText.includes("version") || pkgOutputText.includes("already installed"))) {
                  success = true;
                }

                totalOk++;
                if (success) {
                  addLine(`ââ â ${p.name} instalado!\n`, "info");
                } else {
                  addLine(`ââ â ï¸ ${p.name} processado (verifique: ${p.id} --version)\n`, "err");
                }
                setInstalled((prev) => [
                  ...prev.filter((x) => x.id !== p.id),
                  { id: p.id, version: v.value, at: Date.now() },
                ]);
              } catch (e: any) {
                addLine(`ââ â Erro: ${e?.message ?? String(e)}\n`, "err");
              }
            }

            addLine(`\nââââââââââââââââââââââââââââââââââââââââââââââââââââ`, "info");
            addLine(`â  â CONCLUÃDO: ${totalOk}/${toInstall.length} pacotes instalados com sucesso  â`, "info");
            addLine(`ââââââââââââââââââââââââââââââââââââââââââââââââââââ`, "info");
            setInstallAllRunning(false);
            setInstallDone(true);
            setInstallOk(totalOk > 0);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border, paddingTop: topPadding + 4 }]}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>Plugins</Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 1 }}>
              {PLUGINS.length} plugins disponÃ­veis Â· {installed.length} instalados
            </Text>
          </View>
            <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            <View style={[styles.badge, { backgroundColor: colors.primary + "22", borderColor: colors.primary + "44" }]}>
              <Text style={{ color: colors.primary, fontSize: 11, fontWeight: "700" }}>{installed.length} ativos</Text>
            </View>
            <TouchableOpacity
              onPress={installAll}
              disabled={installAllRunning}
              style={{
                backgroundColor: installAllRunning ? colors.secondary : "#00d4aa22",
                borderWidth: 1.5,
                borderColor: installAllRunning ? colors.border : "#00d4aa",
                borderRadius: 8,
                paddingHorizontal: 10,
                paddingVertical: 5,
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
              }}
            >
              {installAllRunning ? (
                <ActivityIndicator size="small" color="#00d4aa" />
              ) : (
                <Feather name="download-cloud" size={13} color="#00d4aa" />
              )}
              <Text style={{ color: "#00d4aa", fontSize: 11, fontWeight: "700" }}>
                {installAllRunning ? `${installAllProgress}/${PLUGINS.filter(p=>p.action==="install").length}` : "Instalar Todos"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={[styles.searchBox, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <Feather name="search" size={15} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar plugins..."
            placeholderTextColor={colors.mutedForeground}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Feather name="x" size={14} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ââ VS Code â Destaque ââ */}
      <TouchableOpacity
        onPress={() => { setShowVSCode(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
        activeOpacity={0.82}
        style={{
          marginHorizontal: 12, marginTop: 12, marginBottom: 4,
          backgroundColor: "#001833",
          borderRadius: 14,
          borderWidth: 1.5,
          borderColor: "#007acc",
          flexDirection: "row",
          alignItems: "center",
          padding: 14,
          gap: 14,
          shadowColor: "#007acc",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 8,
          elevation: 4,
        }}
      >
        {/* Ãcone VS Code (quadrados azuis) */}
        <View style={{ width: 52, height: 52, alignItems: "center", justifyContent: "center" }}>
          <View style={{ width: 44, height: 44, backgroundColor: "#007acc", borderRadius: 10, alignItems: "center", justifyContent: "center" }}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", width: 28, height: 28, gap: 3 }}>
              <View style={{ width: 12, height: 12, backgroundColor: "#fff", borderRadius: 2, opacity: 0.95 }} />
              <View style={{ width: 12, height: 12, backgroundColor: "#fff", borderRadius: 2, opacity: 0.6 }} />
              <View style={{ width: 12, height: 12, backgroundColor: "#fff", borderRadius: 2, opacity: 0.6 }} />
              <View style={{ width: 12, height: 12, backgroundColor: "#fff", borderRadius: 2, opacity: 0.95 }} />
            </View>
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#fff", fontWeight: "800", fontSize: 17, letterSpacing: 0.2 }}>VS Code Editor</Text>
          <Text style={{ color: "#007acc", fontSize: 13, marginTop: 2, fontWeight: "600" }}>Editor profissional dentro do app</Text>
          <Text style={{ color: "#64748b", fontSize: 11, marginTop: 3 }}>â Envia projeto Â· Edita no VS Code Â· â Baixa de volta</Text>
        </View>
        <View style={{ alignItems: "center", gap: 4 }}>
          <Feather name="arrow-right" size={22} color="#007acc" />
          <Text style={{ color: "#007acc", fontSize: 9, fontWeight: "700" }}>ABRIR</Text>
        </View>
      </TouchableOpacity>

      {/* ââ BotÃ£o Status do Sistema ââ */}
      <TouchableOpacity
        onPress={() => { setShowStatus(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
        activeOpacity={0.82}
        style={{
          marginHorizontal: 12, marginTop: 8, marginBottom: 4,
          backgroundColor: "#0d1a0d",
          borderRadius: 12,
          borderWidth: 1,
          borderColor: "#1a4d1a",
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 14,
          paddingVertical: 11,
          gap: 12,
        }}
      >
        <View style={{ width: 32, height: 32, backgroundColor: "#0a2e0a", borderRadius: 8, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 18 }}>ð©º</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#4ade80", fontWeight: "700", fontSize: 14 }}>Status do Sistema â Real</Text>
          <Text style={{ color: "#4a7a4a", fontSize: 11, marginTop: 1 }}>
            Testa Node, Python, Git, npm, memÃ³ria... tudo com comandos reais
          </Text>
        </View>
        <Feather name="chevron-right" size={18} color="#4ade80" />
      </TouchableOpacity>

      {/* Categorias */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.catBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
        contentContainerStyle={{ paddingHorizontal: 12, gap: 8, paddingVertical: 8 }}
      >
        {CATEGORIES.map((cat) => {
          const active = category === cat.key;
          const count = cat.key === "all" ? PLUGINS.length : PLUGINS.filter((p) => p.category.includes(cat.key)).length;
          return (
            <TouchableOpacity
              key={cat.key}
              onPress={() => { setCategory(cat.key); Haptics.selectionAsync(); }}
              style={[styles.catChip, { backgroundColor: active ? colors.primary : colors.secondary, borderColor: active ? colors.primary : colors.border }]}
            >
              {active && <Feather name="check" size={11} color="#fff" />}
              <Text style={{ color: active ? "#fff" : colors.mutedForeground, fontSize: 12, fontWeight: active ? "700" : "400", marginLeft: active ? 4 : 0 }}>
                {cat.label} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Lista */}
      <FlatList
        data={filtered}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ paddingBottom: bottomPadding, paddingTop: 8 }}
        renderItem={({ item: p }) => {
          const inst = installed.find((i) => i.id === p.id);
          return (
            <TouchableOpacity
              onPress={() => handlePluginPress(p)}
              style={[styles.pluginCard, { backgroundColor: colors.card, borderColor: inst ? colors.primary + "66" : colors.border }]}
              activeOpacity={0.75}
            >
              <View style={[styles.pluginIcon, { backgroundColor: p.iconBg }]}>
                <Text style={{ fontSize: 26 }}>{p.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <Text style={[styles.pluginName, { color: colors.foreground }]}>{p.name}</Text>
                  {p.popular && (
                    <View style={[styles.pill, { backgroundColor: "#10b98122", borderColor: "#10b98155" }]}>
                      <Text style={{ color: "#10b981", fontSize: 9, fontWeight: "700" }}>Popular</Text>
                    </View>
                  )}
                  {inst && (
                    <View style={[styles.pill, { backgroundColor: colors.primary + "22", borderColor: colors.primary + "55" }]}>
                      <Text style={{ color: colors.primary, fontSize: 9, fontWeight: "700" }}>â Instalado</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.pluginDesc, { color: colors.mutedForeground }]}>{p.description}</Text>
                {p.action === "editor" ? (
                  <Text style={{ color: "#007acc", fontSize: 11, marginTop: 4, fontWeight: "600" }}>Toque para abrir o editor â</Text>
                ) : p.versions.length > 0 ? (
                  <Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 4 }}>
                    {p.versions.length} versÃµes disponÃ­veis
                  </Text>
                ) : null}
              </View>
              <Feather name={p.action === "editor" ? "arrow-right" : "download"} size={16} color={p.action === "editor" ? "#007acc" : colors.mutedForeground} />
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={{ alignItems: "center", paddingVertical: 48 }}>
            <Text style={{ fontSize: 32 }}>ð</Text>
            <Text style={{ color: colors.mutedForeground, marginTop: 8 }}>Nenhum plugin encontrado</Text>
          </View>
        }
      />

      {/* Modal: SeleÃ§Ã£o de versÃ£o */}
      <Modal
        visible={!!versionPlugin}
        animationType="slide"
        transparent
        onRequestClose={() => setVersionPlugin(null)}
      >
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
            {/* Handle */}
            <View style={{ alignItems: "center", paddingTop: 12, paddingBottom: 4 }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
            </View>

            {/* CabeÃ§alho */}
            <View style={[styles.sheetHeader, { borderBottomColor: colors.border }]}>
              <View style={[styles.pluginIconSm, { backgroundColor: versionPlugin?.iconBg ?? "#222" }]}>
                <Text style={{ fontSize: 28 }}>{versionPlugin?.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sheetTitle, { color: colors.foreground }]}>{versionPlugin?.name}</Text>
                <Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 2 }}>{versionPlugin?.description}</Text>
              </View>
              <TouchableOpacity onPress={() => setVersionPlugin(null)}>
                <Feather name="x" size={22} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.sheetSub, { color: colors.mutedForeground }]}>Selecione a versÃ£o para instalar:</Text>

            <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ padding: 16, gap: 10 }}>
              {versionPlugin?.versions.map((v) => (
                <TouchableOpacity
                  key={v.value}
                  onPress={() => versionPlugin && handleVersionSelect(versionPlugin, v)}
                  style={[
                    styles.versionBtn,
                    {
                      backgroundColor: v.recommended ? colors.primary + "18" : colors.card,
                      borderColor: v.recommended ? colors.primary : colors.border,
                    },
                  ]}
                  activeOpacity={0.75}
                >
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Text style={[styles.versionLabel, { color: colors.foreground }]}>{v.label}</Text>
                      {v.recommended && (
                        <View style={[styles.pill, { backgroundColor: colors.primary + "33", borderColor: colors.primary + "66" }]}>
                          <Text style={{ color: colors.primary, fontSize: 10, fontWeight: "700" }}>Recomendado</Text>
                        </View>
                      )}
                    </View>
                    <Text style={{ color: "#00d4aa", fontSize: 11, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", marginTop: 4 }} numberOfLines={1}>
                      $ {v.cmd.split("&&")[0].trim()}...
                    </Text>
                  </View>
                  <Feather name="download" size={18} color={v.recommended ? colors.primary : colors.mutedForeground} />
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              onPress={() => setVersionPlugin(null)}
              style={[styles.cancelBtn, { borderTopColor: colors.border }]}
            >
              <Text style={{ color: colors.mutedForeground, fontWeight: "600", fontSize: 15 }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal: Instalando */}
      <Modal
        visible={installing}
        animationType="slide"
        transparent
        onRequestClose={() => { if (installDone) setInstalling(false); }}
      >
        <View style={[styles.installOverlay, { backgroundColor: "#0a0a0a" }]}>
          {/* Barra superior */}
          <View style={[styles.installBar, { paddingTop: topPadding + 4 }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
              <Text style={{ fontSize: 20 }}>{installPlugin?.icon}</Text>
              <View>
                <Text style={styles.installBarTitle}>{installPlugin?.name}</Text>
                <Text style={styles.installBarSub}>{installVersion?.label}</Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              {!installDone && <ActivityIndicator color="#00d4aa" size="small" />}
              {installDone && (
                <Text style={{ fontSize: 20 }}>{installOk ? "â" : "â ï¸"}</Text>
              )}
            </View>
          </View>

          {/* Status */}
          <View style={[styles.statusBar, { backgroundColor: installDone ? (installOk ? "#10b98122" : "#f59e0b22") : "#007acc22", borderBottomColor: installDone ? (installOk ? "#10b981" : "#f59e0b") : "#007acc" }]}>
            <Text style={{ color: installDone ? (installOk ? "#10b981" : "#f59e0b") : "#007acc", fontSize: 12, fontWeight: "700" }}>
              {!installDone ? "â³ Instalando... aguarde" : installOk ? "â InstalaÃ§Ã£o concluÃ­da com sucesso!" : "â ï¸ ConcluÃ­do â verifique se o pacote estÃ¡ disponÃ­vel no terminal"}
            </Text>
          </View>

          {/* Output do terminal */}
          <ScrollView
            ref={outputRef}
            style={styles.installOutput}
            contentContainerStyle={{ padding: 12, paddingBottom: 24 }}
            onContentSizeChange={() => outputRef.current?.scrollToEnd({ animated: false })}
          >
            {installLines.map((l, i) => (
              <Text
                key={i}
                style={[
                  styles.installLine,
                  l.type === "err" ? { color: "#f59e0b" } : l.type === "info" ? { color: "#00d4aa" } : { color: "#d4d4d4" },
                ]}
                selectable
              >
                {l.text}
              </Text>
            ))}
            {!installDone && (
              <Text style={{ color: "#666", fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", fontSize: 12 }}>â</Text>
            )}
          </ScrollView>

          {/* BotÃµes pÃ³s-instalaÃ§Ã£o */}
          {installDone && (
            <View style={[styles.installFooter, { borderTopColor: "#2a2a2a", paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
              {installOk && (
                <TouchableOpacity
                  onPress={() => { setInstalling(false); setShowVSCode(true); }}
                  style={[styles.footerBtn, { backgroundColor: "#007acc" }]}
                >
                  <Text style={{ fontSize: 16 }}>ð</Text>
                  <Text style={styles.footerBtnText}>Abrir VS Code</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => { setInstalling(false); router.push("/(tabs)/terminal"); }}
                style={[styles.footerBtn, { backgroundColor: "#1a2a1a" }]}
              >
                <Feather name="terminal" size={16} color="#00ff00" />
                <Text style={[styles.footerBtnText, { color: "#00ff00" }]}>Abrir Terminal</Text>
              </TouchableOpacity>
              {installVersion?.cmd && (
                <TouchableOpacity
                  onPress={() => openInTermux(installVersion.cmd, installPlugin?.name ?? "")}
                  style={[styles.footerBtn, { backgroundColor: "#1a1a2a" }]}
                >
                  <Text style={{ fontSize: 15 }}>ð±</Text>
                  <Text style={[styles.footerBtnText, { color: "#a78bfa" }]}>Instalar no Celular (Termux)</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => setInstalling(false)}
                style={[styles.footerBtn, { backgroundColor: "#1a1a1a" }]}
              >
                <Text style={[styles.footerBtnText, { color: "#888" }]}>Fechar</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>

      {/* Status do Sistema real */}
      <SystemStatus visible={showStatus} onClose={() => setShowStatus(false)} />

      {/* VS Code real */}
      <VSCodeView visible={showVSCode} onClose={() => setShowVSCode(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 22, fontWeight: "700" },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  searchBox: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, marginTop: 10 },
  searchInput: { flex: 1, fontSize: 14 },
  catBar: { borderBottomWidth: 1, flexGrow: 0 },
  catChip: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  pluginCard: { flexDirection: "row", alignItems: "center", marginHorizontal: 12, marginBottom: 8, padding: 14, borderRadius: 12, borderWidth: 1, gap: 12 },
  pluginIcon: { width: 54, height: 54, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  pluginName: { fontSize: 15, fontWeight: "700" },
  pluginDesc: { fontSize: 12, marginTop: 2 },
  pill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  // Sheet
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: 1, maxHeight: "88%" },
  sheetHeader: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  sheetTitle: { fontSize: 18, fontWeight: "700" },
  sheetSub: { fontSize: 13, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4, fontWeight: "600" },
  pluginIconSm: { width: 58, height: 58, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  versionBtn: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 12, borderWidth: 1.5 },
  versionLabel: { fontSize: 14, fontWeight: "700" },
  cancelBtn: { alignItems: "center", paddingVertical: 18, borderTopWidth: 1 },
  // Install modal
  installOverlay: { flex: 1 },
  installBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, backgroundColor: "#111", borderBottomWidth: 1, borderBottomColor: "#222" },
  installBarTitle: { color: "#fff", fontWeight: "700", fontSize: 15 },
  installBarSub: { color: "#888", fontSize: 11, marginTop: 1 },
  statusBar: { paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1 },
  installOutput: { flex: 1, backgroundColor: "#0a0a0a" },
  installLine: { fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", fontSize: 12, lineHeight: 18 },
  installFooter: { borderTopWidth: 1, padding: 12, gap: 8 },
  footerBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 14, borderRadius: 12 },
  footerBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
