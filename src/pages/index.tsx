import { useLoading } from "@/hooks/use-loading";
import { Avatar, Center, Flex, HStack, Icon, IconButton, Input, Text, VStack } from "@chakra-ui/react";
import Head from "next/head";
import { FormEvent, useState } from "react";
import { FaLocationArrow } from "react-icons/fa";
import axios from "axios";

type MessageProps = {
  content: string;
  isUser: boolean;
}

const Message: React.FC<MessageProps> = ({
  content,
  isUser
}) => {
  return (
    <Center bg={isUser ? "purple.200" : ""} w="100%" py={6}
    >
      <HStack w="container.md" h="fit-content" spacing={4} mx={[5, 0]}>
        <Avatar
        />
        <Text color="#4E4187">
          { content }
        </Text>
      </HStack>
    </Center>
  )
}

type Message = {
  content: string;
  isUser: boolean;
}

export default function Home() {
  const [currentMessage, setCurrentMessage] = useState("")
  const [messages, setMessages] = useState<Array<Message>>([{
    content: "Olá, como posso te ajudar com suas dúvidas sobre a UFCG ?",
    isUser: false
  }])
  const {
    loading,
    withLoading
  } = useLoading()

  async function handleSendMessage(e?: FormEvent) {
    if (e) e.preventDefault()
      setMessages(prev => [
        ...prev,
        {
          content: currentMessage,
          isUser: true
        }
      ])
    const response = await withLoading(axios.get(`/api/ask?query=${currentMessage}`))
    setMessages(prev => [
      ...prev,
      {
        content: response.data["answer"],
        isUser: false
      }
    ])
    setCurrentMessage("")
  }

  return (
    <>
      <Head>
        <title>PLN Projeto</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <Flex as="main" h="100vh" bg="whitesmoke" flexDir="column">
        <VStack spacing={0} flex={1} overflowY="scroll"
          sx={
            { 
           '::-webkit-scrollbar':{
                  display:'none'
              }
           }
         }
        >
          {
            messages.map((message, index) => (
              <Message key={index} content={message.content} isUser={message.isUser} />
            ))
          }
        </VStack>
        <Center my={5} w="100%">
          <Flex 
          as="form"
          background="purple.200"
          w="container.sm" 
          color="#4E4187" 
          borderRadius={25} 
          py={2} 
          px={2}
          boxShadow="0 3px 10px 2px rgba( 31, 38, 135, 0.2 )"
          backdropBlur="4px"
          onSubmit={e => handleSendMessage(e)}
          mx={[2, 0]}
          >
            <Input
            bg="transparent"
            focusBorderColor="transparent"
            isDisabled={loading}
            mr={1}
            border="none"
            value={currentMessage}
            onChange={e => setCurrentMessage(e.target.value)}
            />
            <IconButton
            colorScheme='green'
            aria-label='Search database'
            onClick={handleSendMessage}
            isLoading={loading}
            boxShadow="0 3px 10px 2px rgba( 31, 38, 135, 0.2 )"
            bg="rgba( 154, 230, 180, 0.25 )"
            transition="0.25s ease-in-out"
            backdropBlur="4px"
            icon={<Icon
              w={5} 
              h={5} 
              color="whitesmoke"
              transform="rotateZ(45deg)"
              as={FaLocationArrow}/>}
            borderRadius="100%"
            />
          </Flex>
        </Center>
      </Flex>
    </>
  );
}
