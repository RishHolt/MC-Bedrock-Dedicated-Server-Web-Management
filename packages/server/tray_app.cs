using System;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.IO;
using System.Net;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Forms;

namespace BedrockServerTray
{
    static class Program
    {
        [DllImport("user32.dll", CharSet = CharSet.Auto)]
        private static extern bool DestroyIcon(IntPtr handle);

        private static NotifyIcon trayIcon;
        private static Process serverProcess;
        private static ContextMenu trayMenu;
        private static MenuItem statusItem;
        private static System.Windows.Forms.Timer statusTimer;
        private static readonly string ServerUrl = "http://localhost:3001";

        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            string baseDir = AppDomain.CurrentDomain.BaseDirectory;
            Directory.SetCurrentDirectory(baseDir);

            // Start backend daemon completely invisibly
            StartNodeServer(baseDir);

            // Build Tray Menu
            trayMenu = new ContextMenu();

            var openItem = new MenuItem("Open Dashboard (Web App)", (s, e) => OpenDashboard());
            openItem.DefaultItem = true; // Bold style
            trayMenu.MenuItems.Add(openItem);

            trayMenu.MenuItems.Add("-");

            statusItem = new MenuItem("Server: Starting...");
            statusItem.Enabled = false;
            trayMenu.MenuItems.Add(statusItem);

            trayMenu.MenuItems.Add("-");

            trayMenu.MenuItems.Add("Start Server", (s, e) => TriggerServerAction("start", "Starting Bedrock Server..."));
            trayMenu.MenuItems.Add("Stop Server (Graceful)", (s, e) => TriggerServerAction("stop", "Stopping Bedrock Server safely..."));
            trayMenu.MenuItems.Add("Kill Server (Force)", (s, e) => TriggerServerAction("kill", "Forcefully killed Bedrock Server."));

            trayMenu.MenuItems.Add("-");

            trayMenu.MenuItems.Add("Quit Bedrock Manager", (s, e) => ExitApplication());

            // Build Tray Icon
            trayIcon = new NotifyIcon
            {
                Text = "Bedrock Server Manager",
                Icon = CreateAppIcon(),
                ContextMenu = trayMenu,
                Visible = true
            };

            trayIcon.DoubleClick += (s, e) => OpenDashboard();
            trayIcon.Click += (s, e) =>
            {
                MouseEventArgs me = e as MouseEventArgs;
                if (me != null && me.Button == MouseButtons.Left)
                {
                    OpenDashboard();
                }
            };

            // Status Poller Timer
            statusTimer = new System.Windows.Forms.Timer { Interval = 3000 };
            statusTimer.Tick += (s, e) => UpdateServerStatus();
            statusTimer.Start();

            // Wait 2 seconds and open dashboard in default browser
            ThreadPool.QueueUserWorkItem(_ =>
            {
                Thread.Sleep(2000);
                OpenDashboard();
                try
                {
                    trayIcon.ShowBalloonTip(
                        3000,
                        "Bedrock Server Manager",
                        "Web Dashboard running on http://localhost:3001.\nClick tray icon anytime to open.",
                        ToolTipIcon.Info
                    );
                }
                catch {}
            });

            Application.ApplicationExit += (s, e) => Cleanup();

            Application.Run(new ApplicationContext());
        }

        private static void StartNodeServer(string baseDir)
        {
            string serverEntry = Path.Combine(baseDir, "packages", "server", "dist", "index.js");
            string nodePath = "node.exe";
            if (File.Exists(@"C:\Program Files\nodejs\node.exe"))
            {
                nodePath = @"C:\Program Files\nodejs\node.exe";
            }

            try
            {
                serverProcess = new Process
                {
                    StartInfo = new ProcessStartInfo
                    {
                        FileName = nodePath,
                        Arguments = "\"" + serverEntry + "\"",
                        WorkingDirectory = baseDir,
                        UseShellExecute = false,
                        CreateNoWindow = true,
                        WindowStyle = ProcessWindowStyle.Hidden
                    }
                };
                serverProcess.Start();
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "Failed to start backend daemon: " + ex.Message + "\nPlease ensure Node.js is installed.",
                    "Bedrock Server Manager Error",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
                Environment.Exit(1);
            }
        }

        private static void OpenDashboard()
        {
            try
            {
                Process.Start(new ProcessStartInfo
                {
                    FileName = ServerUrl,
                    UseShellExecute = true
                });
            }
            catch (Exception ex)
            {
                MessageBox.Show("Unable to open browser: " + ex.Message, "Error", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
        }

        private static void TriggerServerAction(string action, string notificationMsg)
        {
            ThreadPool.QueueUserWorkItem(_ =>
            {
                try
                {
                    var request = (HttpWebRequest)WebRequest.Create(ServerUrl + "/api/server/" + action);
                    request.Method = "POST";
                    request.Timeout = 5000;
                    using (var resp = (HttpWebResponse)request.GetResponse())
                    {
                        if ((int)resp.StatusCode == 200 && !string.IsNullOrEmpty(notificationMsg))
                        {
                            trayIcon.ShowBalloonTip(2000, "Bedrock Server", notificationMsg, ToolTipIcon.Info);
                        }
                    }
                }
                catch (Exception ex)
                {
                    trayIcon.ShowBalloonTip(3000, "Action Error", "Failed to " + action + ": " + ex.Message, ToolTipIcon.Warning);
                }
                UpdateServerStatus();
            });
        }

        private static void UpdateServerStatus()
        {
            ThreadPool.QueueUserWorkItem(_ =>
            {
                try
                {
                    var request = (HttpWebRequest)WebRequest.Create(ServerUrl + "/api/server/status");
                    request.Method = "GET";
                    request.Timeout = 2000;
                    using (var resp = (HttpWebResponse)request.GetResponse())
                    using (var reader = new StreamReader(resp.GetResponseStream()))
                    {
                        string json = reader.ReadToEnd();
                        string state = "offline";
                        if (json.Contains("\"state\":\"online\"")) state = "online";
                        else if (json.Contains("\"state\":\"starting\"")) state = "starting";
                        else if (json.Contains("\"state\":\"stopping\"")) state = "stopping";

                        if (trayIcon != null)
                        {
                            trayIcon.Text = "Bedrock Server: " + state.ToUpper() + " (UDP 19132)";
                        }

                        if (statusItem != null)
                        {
                            statusItem.Text = "Status: " + state.ToUpper() + " (Port 19132)";
                        }
                    }
                }
                catch
                {
                    if (statusItem != null) statusItem.Text = "Status: Daemon Connecting...";
                }
            });
        }

        private static Icon CreateAppIcon()
        {
            // Dynamically generate a crisp 32x32 Minecraft Emerald style block icon
            using (var bmp = new Bitmap(32, 32))
            using (var g = Graphics.FromImage(bmp))
            {
                g.SmoothingMode = SmoothingMode.AntiAlias;
                g.Clear(Color.Transparent);

                // Outer rounded rectangle
                using (var brush = new LinearGradientBrush(new Rectangle(2, 2, 28, 28), Color.FromArgb(16, 185, 129), Color.FromArgb(5, 150, 105), LinearGradientMode.ForwardDiagonal))
                using (var pen = new Pen(Color.FromArgb(110, 231, 183), 1.5f))
                {
                    g.FillRectangle(brush, 3, 3, 26, 26);
                    g.DrawRectangle(pen, 3, 3, 26, 26);
                }

                // Inner diamond pattern
                using (var innerBrush = new SolidBrush(Color.FromArgb(209, 250, 229)))
                {
                    Point[] diamond = new Point[]
                    {
                        new Point(16, 7),
                        new Point(25, 16),
                        new Point(16, 25),
                        new Point(7, 16)
                    };
                    g.FillPolygon(innerBrush, diamond);
                }

                // Center core
                using (var coreBrush = new SolidBrush(Color.FromArgb(4, 120, 87)))
                {
                    Point[] core = new Point[]
                    {
                        new Point(16, 11),
                        new Point(21, 16),
                        new Point(16, 21),
                        new Point(11, 16)
                    };
                    g.FillPolygon(coreBrush, core);
                }

                IntPtr hIcon = bmp.GetHicon();
                Icon icon = (Icon)Icon.FromHandle(hIcon).Clone();
                DestroyIcon(hIcon);
                return icon;
            }
        }

        private static void ExitApplication()
        {
            Cleanup();
            Application.Exit();
        }

        private static void Cleanup()
        {
            if (statusTimer != null)
            {
                statusTimer.Stop();
                statusTimer.Dispose();
            }

            if (trayIcon != null)
            {
                trayIcon.Visible = false;
                trayIcon.Dispose();
            }

            // Gracefully stop BDS server
            try
            {
                var request = (HttpWebRequest)WebRequest.Create(ServerUrl + "/api/server/stop");
                request.Method = "POST";
                request.Timeout = 3000;
                using (var resp = request.GetResponse()) {}
                Thread.Sleep(1000);
            }
            catch {}

            // Terminate node process
            if (serverProcess != null && !serverProcess.HasExited)
            {
                try
                {
                    serverProcess.Kill();
                }
                catch {}
            }
        }
    }
}
