import { useEffect } from "react";
import React from "react";
import { Unity, useUnityContext } from "react-unity-webgl";
import ReactRouterPrompt from "react-router-prompt";
import { FloatButton, Layout, Modal, Progress, Row, message } from "antd";
import { ArrowsAltOutlined } from "@ant-design/icons";
import { useUrl } from "../../api/hooks/url";
import { ContestProps } from ".";
import * as graphql from "@/generated/graphql";
import NotImplemented from "./Components/NotImplemented";
import Loading from "../Components/Loading";
import styled from "styled-components";
import streamTHUAI7 from "./Components/Stream/THUAI7";

export interface StreamProps {
  streamUrl: string;
  port: string;
  callback: (response: any) => void;
}

const Container = styled.div`
  height: calc(100vh - 72px);
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const StreamPage: React.FC<ContestProps> = ({ mode, user }) => {
  const url = useUrl();
  const contest = url.query.get("contest");

  const { data: contestSwitchData, error: contestSwitchError } =
    graphql.useGetContestSwitchQuery({
      variables: {
        contest_id: contest,
      },
    });
  useEffect(() => {
    if (contestSwitchError) {
      message.error("获取比赛状态失败");
      console.log(contestSwitchError.message);
    }
  });

  const streamUrl = url.query.get("url") ?? "https://live.eesast.com/";
  const port = url.query.get("port") ?? "";

  const projectUrl =
    process.env.REACT_APP_STATIC_URL! + "/public/WebGL/THUAI7/";
  const projectName = "stream";

  const handleCacheControl = (url: string) => {
    if (url.match(/\.data/) || url.match(/\.wasm/) || url.match(/\.bundle/)) {
      // 可变的资源
      return "must-revalidate";
    }
    if (url.match(/\.mp4/) || url.match(/\.wav/)) {
      // 不变的静态资源
      return "immutable";
    }
    return "no-store";
  };

  const {
    unityProvider,
    sendMessage,
    isLoaded,
    unload,
    requestFullscreen,
    loadingProgression,
  } = useUnityContext({
    loaderUrl: projectUrl + projectName + ".loader.js",
    dataUrl: projectUrl + projectName + ".data",
    frameworkUrl: projectUrl + projectName + ".framework.js",
    codeUrl: projectUrl + projectName + ".wasm",
    streamingAssetsUrl: projectUrl,
    cacheControl: handleCacheControl,
  });

  const update = (response: any) => {
    const message = JSON.stringify(response.toObject());
    sendMessage("UpdateManager", "UpdateMessageByJson", message);
    console.log("Received data from server");
  };

  useEffect(() => {
    if (!isLoaded) {
      return;
    }
    streamTHUAI7({ streamUrl, port, callback: update });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded]);

  const handleQuit = async () => {
    try {
      await unload();
      return;
    } catch (err) {
      console.log(err);
    }
  };

  return contestSwitchData ? (
    contestSwitchData?.contest_by_pk?.stream_switch ? (
      <Layout>
        <Row>
          {isLoaded === false && (
            <Container>
              <Progress
                type="circle"
                percent={Math.min(
                  Math.round(((loadingProgression * 100) / 90) * 99),
                  100,
                )}
              />
            </Container>
          )}
          <Unity
            unityProvider={unityProvider}
            css={`
              width: 100%;
              max-width: calc((100vh - 72px) / 9 * 16);
              max-height: calc(100vh - 72px);
              aspect-ratio: 16 / 9;
              padding: 0.9vw 1.6vw;
            `}
          />
        </Row>
        <FloatButton
          icon={<ArrowsAltOutlined />}
          style={{ right: 48 }}
          type="primary"
          onClick={() => {
            requestFullscreen(true);
          }}
        />
        <ReactRouterPrompt when={isLoaded}>
          {({ isActive, onConfirm, onCancel }) => (
            <Modal
              open={isActive}
              cancelText="再看看"
              centered={true}
              okText="结束直播"
              title="离开页面前，请先结束直播"
              onOk={async () => {
                await handleQuit();
                onConfirm();
              }}
              onCancel={onCancel}
              width={320}
            />
          )}
        </ReactRouterPrompt>
      </Layout>
    ) : (
      <NotImplemented />
    )
  ) : (
    <Loading />
  );
};

export default StreamPage;
