import { Html, Head, Preview, Body, Container, Text } from "@react-email/components";

export default function OtpEmails({ otp }: { otp: string }) {
  return (
    <Html>
      <Head />
      <Preview>InkSync OTP</Preview>
      <Body style={{ fontFamily: "Arial", backgroundColor: "#f4f4f4" }}>
        <Container>
          <Text>Your OTP is:</Text>
          <Text style={{ fontSize: "24px", fontWeight: "bold" }}>{otp}</Text>
          <Text>Valid for 10 minutes.</Text>
        </Container>
      </Body>
    </Html>
  );
}