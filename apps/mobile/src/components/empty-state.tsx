import { View } from "react-native";
import { space } from "@/theme";
import { Button } from "./button";
import { Card } from "./card";
import { Text } from "./text";

type Props = {
  title: string;
  body: string;
  action?: { label: string; onPress: () => void };
};

/** Qué es + por qué está vacío + cómo empezar (DESIGN.md §5). */
export function EmptyState({ title, body, action }: Props) {
  return (
    <Card gap={space.lg} padding={space.xl}>
      <View style={{ gap: space.xs }}>
        <Text variant="titleMd">{title}</Text>
        <Text variant="bodyMd" tone="inkSecondary">
          {body}
        </Text>
      </View>
      {action ? <Button label={action.label} onPress={action.onPress} /> : null}
    </Card>
  );
}
