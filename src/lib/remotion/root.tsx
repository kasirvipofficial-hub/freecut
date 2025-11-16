import { Composition } from 'remotion';
import { MainComposition } from './compositions/main-composition';

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="MainComposition"
        component={MainComposition}
        durationInFrames={3000}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
