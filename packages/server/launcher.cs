using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Threading;

namespace BedrockServerManager
{
    class Program
    {
        private static Process serverProcess = null;

        static void Main(string[] args)
        {
            Console.Title = "Minecraft Bedrock Server Web Management";
            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine(@"
  ____            _                _       __  __                                   
 |  _ \          | |              | |     |  \/  |                                  
 | |_) | ___   __| |_ __ ___   ___| | __  | \  / | __ _ _ __   __ _  __ _  ___ _ __ 
 |  _ < / _ \ / _` | '__/ _ \ / __| |/ /  | |\/| |/ _` | '_ \ / _` |/ _` |/ _ \ '__|
 | |_) |  __/| (_| | | | (_) | (__|   <   | |  | | (_| | | | | (_| | (_| |  __/ |   
 |____/ \___| \__,_|_|  \___/ \___|_|\_\  |_|  |_|\__,_|_| |_|\__,_|\__, |\___|_|   
                                                                      __/ |         
                                                                     |___/          ");
            Console.ResetColor();
            Console.WriteLine("======================================================================");
            Console.WriteLine("  Minecraft Bedrock Dedicated Server Web Management v1.0");
            Console.WriteLine("  Inspired by Fabricator (https://docs.fabricator.site/)");
            Console.WriteLine("======================================================================");

            string baseDir = AppDomain.CurrentDomain.BaseDirectory;
            Directory.SetCurrentDirectory(baseDir);

            // Locate node executable
            string nodePath = "node";
            try
            {
                Process checkNode = new Process
                {
                    StartInfo = new ProcessStartInfo
                    {
                        FileName = "node",
                        Arguments = "-v",
                        RedirectStandardOutput = true,
                        UseShellExecute = false,
                        CreateNoWindow = true
                    }
                };
                checkNode.Start();
                string nodeVer = checkNode.StandardOutput.ReadToEnd().Trim();
                checkNode.WaitForExit();
                Console.ForegroundColor = ConsoleColor.Green;
                Console.WriteLine("  [✓] Detected Node.js Runtime: " + nodeVer);
                Console.ResetColor();
            }
            catch
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine("  [✗] Error: Node.js is not found in PATH.");
                Console.WriteLine("      Please install Node.js (https://nodejs.org) to run the server.");
                Console.ResetColor();
                Console.WriteLine("\nPress any key to exit...");
                Console.ReadKey();
                return;
            }

            // Path to server entry
            string serverEntry = Path.Combine(baseDir, "packages", "server", "dist", "index.js");
            if (!File.Exists(serverEntry))
            {
                Console.ForegroundColor = ConsoleColor.Yellow;
                Console.WriteLine("  [!] Server distribution not found. Building server package...");
                Console.ResetColor();

                Process buildProc = Process.Start(new ProcessStartInfo
                {
                    FileName = "cmd.exe",
                    Arguments = "/c npm run build --workspace=packages/server",
                    WorkingDirectory = baseDir,
                    UseShellExecute = false
                });
                buildProc.WaitForExit();
            }

            // Handle Ctrl+C and process exit
            Console.CancelKeyPress += (sender, eventArgs) =>
            {
                eventArgs.Cancel = true;
                ShutdownServer();
                Environment.Exit(0);
            };

            AppDomain.CurrentDomain.ProcessExit += (sender, eventArgs) =>
            {
                ShutdownServer();
            };

            Console.WriteLine("  [*] Starting unified server daemon (Web Dashboard + BDS)...");

            serverProcess = new Process
            {
                StartInfo = new ProcessStartInfo
                {
                    FileName = nodePath,
                    Arguments = "\"" + serverEntry + "\"",
                    WorkingDirectory = baseDir,
                    UseShellExecute = false,
                    RedirectStandardOutput = false,
                    RedirectStandardError = false
                }
            };

            try
            {
                serverProcess.Start();
            }
            catch (Exception ex)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine("  [✗] Failed to start server daemon: " + ex.Message);
                Console.ResetColor();
                return;
            }

            Console.WriteLine("  [*] Waiting for web service to be ready on http://localhost:3001...");
            Thread.Sleep(2000);

            Console.ForegroundColor = ConsoleColor.Green;
            Console.WriteLine("  [✓] Unified Web Manager listening on: http://localhost:3001");
            Console.WriteLine("  [✓] Minecraft Bedrock UDP Port:     19132");
            Console.ResetColor();
            Console.WriteLine("======================================================================");
            Console.WriteLine("  [→] Opening http://localhost:3001 in your default browser...");
            Console.WriteLine("  [!] Keep this window open while using the web manager.");
            Console.WriteLine("  [!] Press Ctrl+C in this console to safely exit.");
            Console.WriteLine("======================================================================\n");

            // Open default browser
            try
            {
                Process.Start(new ProcessStartInfo
                {
                    FileName = "http://localhost:3001",
                    UseShellExecute = true
                });
            }
            catch {}

            // Keep main process alive until server process terminates
            serverProcess.WaitForExit();
        }

        private static void ShutdownServer()
        {
            if (serverProcess != null && !serverProcess.HasExited)
            {
                Console.ForegroundColor = ConsoleColor.Yellow;
                Console.WriteLine("\n[*] Shutting down Bedrock Server Manager...");
                Console.ResetColor();

                try
                {
                    var request = (HttpWebRequest)WebRequest.Create("http://localhost:3001/api/server/stop");
                    request.Method = "POST";
                    request.Timeout = 3000;
                    using (var resp = request.GetResponse()) {}
                    Thread.Sleep(1000);
                }
                catch {}

                try
                {
                    if (!serverProcess.HasExited)
                    {
                        serverProcess.Kill();
                    }
                }
                catch {}
            }
        }
    }
}
