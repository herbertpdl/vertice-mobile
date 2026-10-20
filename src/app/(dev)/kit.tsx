import { Redirect } from "expo-router";
import { Plus, Search } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  Avatar,
  Badge,
  Button,
  Checkbox,
  Chip,
  CountPill,
  Divider,
  ExerciseThumb,
  IconButton,
  InlineLink,
  ProgressBar,
  SearchField,
  Skeleton,
  Spinner,
  StatCard,
  Tag,
  Text,
  TextArea,
  TextField,
  TextLink,
  WeekDots,
} from "@/components/ui";
import { colors, screenPaddingHorizontal, space } from "@/theme";

/**
 * Dev-only gallery of every kit component in every state — the mobile stand-in for the web's
 * Storybook. Open `/kit` in a dev build (`npx expo start`, then the URL or a deep link). Release
 * builds redirect home. Add each new kit component here with all its states.
 */
export default function KitScreen() {
  const [search, setSearch] = useState("");
  const [checked, setChecked] = useState(true);
  const [notes, setNotes] = useState("Movimento composto para espessura de dorsais.");

  if (!__DEV__) return <Redirect href="/" />;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="title">Kit</Text>

        <Section title="Text">
          {(["display", "title", "headline", "titleSm", "section", "navTitle", "lead", "body", "label", "caption", "overline"] as const).map(
            (variant) => (
              <Text key={variant} variant={variant}>
                {variant}
              </Text>
            ),
          )}
        </Section>

        <Section title="Button">
          <Button label="Continuar" />
          <Button label="Cancelar" variant="secondary" />
          <Button label="Excluir" variant="danger" />
          <Button label="Sair" variant="ghost" />
          <Button label="Novo aluno" icon={Plus} />
          <Button label="Salvando…" loading />
          <Button label="Desabilitado" disabled />
          <Button label="Desabilitado" variant="secondary" disabled />
        </Section>

        <Section title="IconButton">
          <Row>
            <IconButton icon={Plus} accessibilityLabel="Novo" />
            <IconButton icon={Search} variant="surface" accessibilityLabel="Buscar" />
            <IconButton icon={Search} variant="plain" accessibilityLabel="Buscar" />
            <IconButton icon={Plus} disabled accessibilityLabel="Novo" />
          </Row>
        </Section>

        <Section title="Fields">
          <TextField label="E-mail" placeholder="voce@exemplo.com" keyboardType="email-address" />
          <TextField label="E-mail" defaultValue="ana.trainer" error="Informe um e-mail válido." />
          <TextField label="Senha" placeholder="Digite sua senha" password />
          <TextField label="CPF" defaultValue="123.456.789-00" disabled help="Não pode ser alterado." />
          <TextArea label="Descrição" value={notes} onChangeText={setNotes} maxLength={2000} />
          <SearchField value={search} onChangeText={setSearch} placeholder="Buscar aluno" />
        </Section>

        <Section title="Chip / Badge / Tag">
          <Row>
            <Chip label="Todos" selected />
            <Chip label="Com plano ativo" />
          </Row>
          <Row>
            {(["neutral", "success", "warning", "danger", "info", "outline"] as const).map((tone) => (
              <Badge key={tone} label={tone} tone={tone} />
            ))}
          </Row>
          <Row>
            <CountPill count={6} />
            <Tag label="Peito" />
            <Tag label="Costas" onRemove={() => {}} />
          </Row>
        </Section>

        <Section title="Avatar / Thumb">
          <Row>
            <Avatar name="Marina Costa" size={40} />
            <Avatar name="Rafael Lima" size={48} />
            <Avatar name="Júlia Prado" size={64} />
            <ExerciseThumb />
            <ExerciseThumb imageUri="https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg" hasVideo />
          </Row>
        </Section>

        <Section title="StatCard">
          <Row>
            <StatCard label="Alunos ativos" value="32" helper="com vínculo ativo" />
            <StatCard label="Planos vencendo" value="3" helper="próximos 7 dias" helperColor="warning" />
          </Row>
        </Section>

        <Section title="Progress / WeekDots / Spinner">
          <ProgressBar value={0.6} tone="warning" accessibilityLabel="Adesão" />
          <WeekDots
            days={[
              { letter: "S", name: "Segunda", done: true },
              { letter: "T", name: "Terça", done: true },
              { letter: "Q", name: "Quarta", done: false },
              { letter: "Q", name: "Quinta", done: false },
              { letter: "S", name: "Sexta", done: false },
            ]}
          />
          <Spinner accessibilityLabel="Carregando" />
        </Section>

        <Section title="Skeleton">
          <Row>
            <Skeleton.Circle />
            <View style={styles.flex}>
              <Skeleton.Line width="80%" />
              <Skeleton.Line width="50%" />
            </View>
          </Row>
          <Skeleton.Block width="100%" height={100} />
        </Section>

        <Section title="Divider / Link / Checkbox">
          <Divider />
          <Divider label="ou" />
          <TextLink label="Ver todos" onPress={() => {}} />
          <Checkbox
            checked={checked}
            onChange={setChecked}
            accessibilityLabel="Li e aceito os termos de uso e a política de privacidade."
            label={
              <Text variant="bodyRelaxed" color="textSecondary">
                Li e aceito os <InlineLink label="termos de uso" onPress={() => {}} /> e a{" "}
                <InlineLink label="política de privacidade" onPress={() => {}} />.
              </Text>
            }
          />
          <Checkbox checked={false} onChange={() => {}} label="Peito" error="Selecione ao menos um grupo." />
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="overline" color="textSecondary">
        {title.toUpperCase()}
      </Text>
      {children}
    </View>
  );
}

function Row({ children }: { children: ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: screenPaddingHorizontal, gap: space[8] },
  section: { gap: space[3] },
  row: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: space[2] },
  flex: { flex: 1, gap: space[2] },
});
