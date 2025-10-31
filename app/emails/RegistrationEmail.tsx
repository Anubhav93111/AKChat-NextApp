import { Html, Head, Preview, Body, Container, Text } from "@react-email/components";

export default function RegistrationEmail({ name }: { name: string }) {
  return (
    <Html>
      <Head />
      <Preview>Welcome to Chat App!</Preview>
      <Body style={{ fontFamily: "Arial", backgroundColor: "#f4f4f4" }}>
        <Container>
          <Text>Hi {name},</Text>
          <Text>Thanks for registering! You&apos;re all set to start chatting 🎉</Text>
        </Container>
      </Body>
    </Html>
  );
}