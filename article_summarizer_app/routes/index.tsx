import { Head } from "$fresh/runtime.ts";
import SummarizerForm from "../islands/SummarizerForm.tsx";

export default function Home() {
  return (
    <>
      <Head>
        <title>Article Summarizer</title>
        <link rel="stylesheet" href="/static/styles.css" />
      </Head>
      <div class="container mx-auto p-4">
        <h1 class="text-3xl font-bold mb-4">Tone-Based Article Summarizer</h1>
        <SummarizerForm />
      </div>
    </>
  );
}
