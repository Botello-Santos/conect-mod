package mx.conectmod.app;

import android.app.DownloadManager;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.print.PrintAttributes;
import android.print.PrintManager;
import android.util.Base64;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.URLUtil;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.activity.ComponentActivity;
import androidx.activity.OnBackPressedCallback;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.core.view.WindowInsetsControllerCompat;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.Set;

/**
 * WebView que abre el portal CONECT e inyecta en todos los marcos los mismos
 * scripts de las extensiones. Comunicación página -> app mediante
 * window.CMODAndroid.postMessage(JSON):
 *   {tipo:'imprimir', html, url, titulo}   imprime con el diálogo de Android
 *   {tipo:'tema', valor:'dark'|'light'}    color de la barra de estado
 *   {tipo:'descargar', nombre, mime, base64} guarda un archivo generado en la página
 */
public class MainActivity extends ComponentActivity {

    private static final String ORIGEN = "https://purisima.tecnm.mx";
    private static final Set<String> REGLAS = Collections.singleton(ORIGEN);

    private WebView web;
    private WebView vistaImpresion;
    private ValueCallback<Uri[]> callbackArchivo;
    private byte[] archivoPendiente;

    private ActivityResultLauncher<Intent> selectorArchivo;
    private ActivityResultLauncher<Intent> guardarArchivo;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        selectorArchivo = registerForActivityResult(new ActivityResultContracts.StartActivityForResult(), r -> {
            if (callbackArchivo == null) return;
            callbackArchivo.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(r.getResultCode(), r.getData()));
            callbackArchivo = null;
        });

        guardarArchivo = registerForActivityResult(new ActivityResultContracts.StartActivityForResult(), r -> {
            byte[] datos = archivoPendiente;
            archivoPendiente = null;
            if (r.getResultCode() != RESULT_OK || r.getData() == null || r.getData().getData() == null || datos == null) return;
            try (OutputStream os = getContentResolver().openOutputStream(r.getData().getData())) {
                if (os == null) throw new IllegalStateException("sin destino");
                os.write(datos);
                aviso("Archivo guardado");
            } catch (Exception e) {
                aviso("No se pudo guardar el archivo: " + e.getMessage());
            }
        });

        web = new WebView(this);
        setContentView(web);
        configurarWebView();

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (web.canGoBack()) web.goBack();
                else finish();
            }
        });

        if (savedInstanceState == null || web.restoreState(savedInstanceState) == null) {
            web.loadUrl(BuildConfig.URL_INICIO);
        }
    }

    private void configurarWebView() {
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setUseWideViewPort(true);
        s.setLoadWithOverviewMode(true);
        s.setBuiltInZoomControls(true);
        s.setDisplayZoomControls(false);
        s.setSupportMultipleWindows(false); // window.open abre en la misma vista
        s.setJavaScriptCanOpenWindowsAutomatically(true);
        s.setAllowFileAccess(false);

        CookieManager cookies = CookieManager.getInstance();
        cookies.setAcceptCookie(true);
        cookies.setAcceptThirdPartyCookies(web, true);

        if (WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
            WebViewCompat.addWebMessageListener(web, "CMODAndroid", REGLAS,
                    (view, message, sourceOrigin, isMainFrame, replyProxy) -> procesarMensaje(message.getData()));
        }
        if (WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
            WebViewCompat.addDocumentStartJavaScript(web, leerAsset("inyectar.js"), REGLAS);
        } else {
            aviso("Actualiza \"Android System WebView\" desde Play Store para activar el mod.");
        }

        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri u = request.getUrl();
                String esquema = u.getScheme();
                if ("http".equals(esquema) || "https".equals(esquema)) return false;
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, u));
                } catch (ActivityNotFoundException ignorado) {
                    // sin app para ese enlace
                }
                return true;
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (callbackArchivo != null) callbackArchivo.onReceiveValue(null);
                callbackArchivo = callback;
                Intent i = new Intent(Intent.ACTION_GET_CONTENT);
                i.addCategory(Intent.CATEGORY_OPENABLE);
                i.setType("*/*");
                try {
                    selectorArchivo.launch(Intent.createChooser(i, "Selecciona un archivo"));
                } catch (ActivityNotFoundException e) {
                    callbackArchivo = null;
                    return false;
                }
                return true;
            }
        });

        web.setDownloadListener((url, userAgent, contentDisposition, mimeType, contentLength) -> {
            if (url.startsWith("blob:") || url.startsWith("data:")) {
                aviso("Esta descarga no es compatible con la app.");
                return;
            }
            try {
                String nombre = URLUtil.guessFileName(url, contentDisposition, mimeType);
                DownloadManager.Request req = new DownloadManager.Request(Uri.parse(url));
                String c = CookieManager.getInstance().getCookie(url);
                if (c != null) req.addRequestHeader("Cookie", c);
                req.addRequestHeader("User-Agent", userAgent);
                req.setMimeType(mimeType);
                req.setTitle(nombre);
                req.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    req.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, nombre);
                } else {
                    req.setDestinationInExternalFilesDir(this, Environment.DIRECTORY_DOWNLOADS, nombre);
                }
                DownloadManager dm = (DownloadManager) getSystemService(DOWNLOAD_SERVICE);
                dm.enqueue(req);
                aviso("Descargando " + nombre);
            } catch (Exception e) {
                aviso("No se pudo descargar: " + e.getMessage());
            }
        });
    }

    private void procesarMensaje(String datos) {
        if (datos == null) return;
        try {
            JSONObject o = new JSONObject(datos);
            String tipo = o.optString("tipo");
            switch (tipo) {
                case "imprimir":
                    imprimir(o.optString("html"), o.optString("url"), o.optString("titulo", "CONECT"));
                    break;
                case "tema":
                    aplicarTema("dark".equals(o.optString("valor")));
                    break;
                case "descargar":
                    guardar(o.optString("nombre", "archivo"), o.optString("mime", "application/octet-stream"), o.optString("base64"));
                    break;
                default:
                    break;
            }
        } catch (Exception e) {
            aviso("Mensaje inválido de la página: " + e.getMessage());
        }
    }

    private void imprimir(String html, String url, String titulo) {
        WebView w = new WebView(this);
        w.getSettings().setJavaScriptEnabled(false);
        w.setWebViewClient(new WebViewClient() {
            private boolean listo = false;

            @Override
            public void onPageFinished(WebView view, String u) {
                if (listo) return;
                listo = true;
                PrintManager pm = (PrintManager) getSystemService(PRINT_SERVICE);
                String nombre = titulo.isEmpty() ? "CONECT" : titulo;
                pm.print(nombre, view.createPrintDocumentAdapter(nombre), new PrintAttributes.Builder().build());
            }
        });
        w.loadDataWithBaseURL(url, html, "text/html", "UTF-8", null);
        vistaImpresion = w; // mantener la referencia mientras se imprime
    }

    private void aplicarTema(boolean oscuro) {
        int color = oscuro ? Color.parseColor("#0e141d") : Color.WHITE;
        getWindow().setStatusBarColor(color);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) getWindow().setNavigationBarColor(color);
        View decor = getWindow().getDecorView();
        WindowInsetsControllerCompat c = new WindowInsetsControllerCompat(getWindow(), decor);
        c.setAppearanceLightStatusBars(!oscuro);
        c.setAppearanceLightNavigationBars(!oscuro);
    }

    private void guardar(String nombre, String mime, String base64) {
        try {
            archivoPendiente = Base64.decode(base64, Base64.DEFAULT);
        } catch (IllegalArgumentException e) {
            aviso("Archivo dañado");
            return;
        }
        Intent i = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        i.addCategory(Intent.CATEGORY_OPENABLE);
        i.setType(mime);
        i.putExtra(Intent.EXTRA_TITLE, nombre);
        try {
            guardarArchivo.launch(i);
        } catch (ActivityNotFoundException e) {
            archivoPendiente = null;
            aviso("No hay una app para guardar archivos.");
        }
    }

    private String leerAsset(String nombre) {
        try (InputStream in = getAssets().open(nombre); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buf = new byte[16384];
            int n;
            while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
            return out.toString(StandardCharsets.UTF_8.name());
        } catch (Exception e) {
            return "";
        }
    }

    private void aviso(String texto) {
        runOnUiThread(() -> Toast.makeText(this, texto, Toast.LENGTH_LONG).show());
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        web.saveState(outState);
    }

    @Override
    protected void onDestroy() {
        if (vistaImpresion != null) vistaImpresion.destroy();
        web.destroy();
        super.onDestroy();
    }
}
