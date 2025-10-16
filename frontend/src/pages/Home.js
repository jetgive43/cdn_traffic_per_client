import React from "react";
import {
  Container,
} from "@mui/material";
import LogTable from "../components/LogTable";

export default function Home() {
  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <LogTable />
    </Container>
  );
}
