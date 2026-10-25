import {structuredAnalysisPacketFixture} from '../../../../tests/runtime-application/analysis-runtime-fixtures.ts';
export function customInput() {
  const packet=structuredAnalysisPacketFixture();
  packet.projectId='source-defined-commercial-project';
  packet.projectFacts.brandName.value='Offline custom project';
  packet.projectFacts.industry.value='Commercial service';
  const spatial=packet.mediaTranslations.spatial;
  spatial.sceneProgram=['展示界面','比较工作台','两侧服务通道'];
  spatial.functionalNetwork=['展示界面连接比较工作台，服务通道位于两侧'];
  spatial.functionalRelationships=['The comparison worktable separates staff and visitor sides with access on both sides.'];
  spatial.mustBeVisible=['Two accessible chairs face each other across the comparison worktable.'];
  spatial.structureLanguage=['Display bays occupy the perimeter and leave open access around the worktable.'];
  spatial.signatureSpatialMechanism=spatial.structureLanguage.slice();
  spatial.brandRoleManifestation=[];spatial.peopleBehavior=[];spatial.brandIntegration=[];spatial.positiveDifferentiators=[];
  return {packet,projectContext:{},taskContract:{projectId:packet.projectId,generationBasis:'standard',subtype:'custom',aspectRatio:'16:9'}};
}
