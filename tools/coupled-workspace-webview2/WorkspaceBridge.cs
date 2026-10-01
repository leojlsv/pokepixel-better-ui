using System;
using System.Collections.Generic;
using System.IO;
using System.Runtime.Serialization;
using System.Runtime.Serialization.Json;
using System.Text;

namespace PokePixel.CoupledWorkspace
{
    [DataContract]
    internal sealed class WorkspaceBridgeSurface
    {
        [DataMember(Name = "id")]
        public string Id { get; set; }

        [DataMember(Name = "label")]
        public string Label { get; set; }

        [DataMember(Name = "available")]
        public bool Available { get; set; }
    }

    [DataContract]
    internal sealed class WorkspaceBridgeMessage
    {
        [DataMember(Name = "type")]
        public string Type { get; set; }

        [DataMember(Name = "protocol")]
        public int Protocol { get; set; }

        [DataMember(Name = "surfaces", EmitDefaultValue = false)]
        public List<WorkspaceBridgeSurface> Surfaces { get; set; }

        [DataMember(Name = "requestId", EmitDefaultValue = false)]
        public string RequestId { get; set; }

        [DataMember(Name = "surfaceId", EmitDefaultValue = false)]
        public string SurfaceId { get; set; }

        [DataMember(Name = "ok", EmitDefaultValue = false)]
        public bool Ok { get; set; }

        [DataMember(Name = "error", EmitDefaultValue = false)]
        public string Error { get; set; }

        [DataMember(Name = "viewMode", EmitDefaultValue = false)]
        public string ViewMode { get; set; }

        [DataMember(Name = "sessionId", EmitDefaultValue = false)]
        public string SessionId { get; set; }

        [DataMember(Name = "documentEpoch", EmitDefaultValue = false)]
        public string DocumentEpoch { get; set; }

        [DataMember(Name = "documentUrl", EmitDefaultValue = false)]
        public string DocumentUrl { get; set; }

        [DataMember(Name = "mountOrdinal", EmitDefaultValue = false)]
        public int MountOrdinal { get; set; }

        [DataMember(Name = "capabilitySeq", EmitDefaultValue = false)]
        public int CapabilitySeq { get; set; }

        [DataMember(Name = "viewRevision", EmitDefaultValue = false)]
        public int ViewRevision { get; set; }

        [DataMember(Name = "leaderId", EmitDefaultValue = false)]
        public string LeaderId { get; set; }

        [DataMember(Name = "leaderSpeciesId", EmitDefaultValue = false)]
        public string LeaderSpeciesId { get; set; }

        [DataMember(Name = "nativeProfileId", EmitDefaultValue = false)]
        public string NativeProfileId { get; set; }

        [DataMember(Name = "leaderLevel", EmitDefaultValue = false)]
        public int LeaderLevel { get; set; }

        [DataMember(Name = "inputJson", EmitDefaultValue = false)]
        public string InputJson { get; set; }

        [DataMember(Name = "resultJson", EmitDefaultValue = false)]
        public string ResultJson { get; set; }

    }

    internal static class WorkspaceBridgeProtocol
    {
        public const int Version = 1;
        public const string CapabilitiesType = "ppbui.coupled.capabilities";
        public const string CapabilitiesAcceptedType = "ppbui.coupled.capabilities-accepted";
        public const string SessionHelloType = "ppbui.coupled.session-hello";
        public const string SessionReadyType = "ppbui.coupled.session-ready";
        public const string ResyncCapabilitiesType = "ppbui.coupled.resync-capabilities";
        public const string OpenSurfaceType = "ppbui.coupled.open-surface";
        public const string OpenSurfaceResultType = "ppbui.coupled.open-surface-result";
        public const string SetViewType = "ppbui.coupled.set-view";
        public const string PptoolsRunType = "ppbui.pptools.run";
        public const string PptoolsCancelType = "ppbui.pptools.cancel";
        public const string PptoolsResultType = "ppbui.pptools.result";

        public static WorkspaceBridgeMessage Deserialize(string json)
        {
            if (string.IsNullOrWhiteSpace(json)) return null;
            try
            {
                var serializer = new DataContractJsonSerializer(typeof(WorkspaceBridgeMessage));
                using (var stream = new MemoryStream(Encoding.UTF8.GetBytes(json)))
                    return serializer.ReadObject(stream) as WorkspaceBridgeMessage;
            }
            catch (SerializationException)
            {
                return null;
            }
        }

        public static string Serialize(WorkspaceBridgeMessage message)
        {
            if (message == null) throw new ArgumentNullException("message");
            var serializer = new DataContractJsonSerializer(typeof(WorkspaceBridgeMessage));
            using (var stream = new MemoryStream())
            {
                serializer.WriteObject(stream, message);
                return Encoding.UTF8.GetString(stream.ToArray());
            }
        }
    }
}
