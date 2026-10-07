"use client";

import { DownloadIcon, QrCodeIcon } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

/** QR code of the public page: for business cards, slides and printed CVs. */
export function QrDialog({ url, username }: { url: string; username: string }) {
  const [open, setOpen] = useState(false);
  const [png, setPng] = useState<string>();

  useEffect(() => {
    if (!open) return;
    // 1024px with a quiet zone: sharp enough for print
    QRCode.toDataURL(url, { width: 1024, margin: 2, errorCorrectionLevel: "M" }).then(setPng);
  }, [open, url]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <QrCodeIcon /> QR-код
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>QR-код страницы</DialogTitle>
          <DialogDescription>Для визитки, презентации или резюме</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4">
          {png ? (
            // eslint-disable-next-line @next/next/no-img-element -- generated data URL
            <img src={png} alt={`QR-код ${url}`} className="size-64 rounded-lg border" />
          ) : (
            <div className="size-64 animate-pulse rounded-lg bg-muted" />
          )}
          <p className="font-mono text-sm text-muted-foreground">{url.replace(/^https?:\/\//, "")}</p>
          <a
            href={png}
            download={`myhub-${username}-qr.png`}
            className={buttonVariants({ className: "w-full" })}
            aria-disabled={!png}
          >
            <DownloadIcon /> Скачать PNG
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}
